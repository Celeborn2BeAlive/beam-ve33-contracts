// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.9;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol";
import "@uniswap/v3-core/contracts/interfaces/callback/IUniswapV3FlashCallback.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/ISwapRouter.sol";
import "./interfaces/IVault.sol";
import "./interfaces/ICash.sol";
import "hardhat/console.sol";

contract ArbMintDebug is IUniswapV3FlashCallback, Ownable {
    using SafeERC20 for IERC20;

    IUniswapV3Pool loanPool;
    address USDC;
    address CASH;
    address USDT;
    ISwapRouter retroRouter;
    ISwapRouter uniswapRouter;
    address addressDripper;
    address addressA;
    address addressB;

    IVault CASHVault;
    bool USDCIsToken0; // USDC number in loanPool

    event Earned(uint256 amount);
    event Distributed(uint256 amountDripper, uint256 amountAB);

    constructor(IUniswapV3Pool _loanPool, address _USDC, address _CASH, address _USDT, ISwapRouter _retroRouter, ISwapRouter _uniswapRouter, address _addressDripper, address _addressA, address _addressB) {
        loanPool = _loanPool;
        USDC = _USDC;
        CASH = _CASH;
        USDT = _USDT;
        retroRouter = _retroRouter;
        uniswapRouter = _uniswapRouter;
        addressDripper = _addressDripper;
        addressA = _addressA;
        addressB = _addressB;

        if (USDC == loanPool.token0()) {
            USDCIsToken0 = true;
        } else if (USDC == loanPool.token1()) {
            USDCIsToken0 = false;
        } else {
            revert("No USDC in loanPool");
        }
        CASHVault = IVault(ICash(CASH).vaultAddress());
    }

    struct FlashCallbackData {
        uint256 borrowedAmount;
    }

    function work(uint256 amountIn) public onlyOwner returns(uint256 profit) {
        uint256 balanceBefore = IERC20(USDC).balanceOf(address(this));
        console.log("[work] Getting flash loan");
        loanPool.flash(
            address(this),
            USDCIsToken0 ? amountIn : 0,
            USDCIsToken0 ? 0 : amountIn,
            abi.encode(FlashCallbackData({
                borrowedAmount: amountIn
            }))
            );
        
        console.log("[work] Flash loan done");

        uint256 balanceAfter = IERC20(USDC).balanceOf(address(this));

        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        console.log("[work] Profit:", profit);
        emit Earned(profit);
    }

    function distributeProfits() public onlyOwner {
        uint256 amountToDistribute = IERC20(USDC).balanceOf(address(this));
        uint256 amountAB = amountToDistribute*15/100;
        uint256 amountDripper = amountToDistribute - 2*amountAB;

        IERC20(USDC).safeTransfer(addressA, amountAB);
        IERC20(USDC).safeTransfer(addressB, amountAB);

        // Swap amountDripper USDC to USDT
        IERC20(USDC).approve(address(uniswapRouter), amountDripper);
        uniswapRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: USDC,
                tokenOut: USDT,
                fee: 100,
                recipient: addressDripper,
                deadline: block.timestamp + 1,
                amountIn: amountDripper,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));

        emit Distributed(amountDripper, amountAB);
    }

    function wokrAndDistributeProfits(uint256 amountIn) external onlyOwner {
        work(amountIn);
        distributeProfits();
    }

    function uniswapV3FlashCallback( // Called after we borrow needed amount
        uint256 fee0,
        uint256 fee1,
        bytes calldata data
    ) external override {
        require(msg.sender == address(loanPool), "Only pool can call callback");
        FlashCallbackData memory decoded = abi.decode(
            data,
            (FlashCallbackData)
        );

        uint256 remainingDebt = decoded.borrowedAmount + (USDCIsToken0 ? fee0 : fee1);
        console.log("[uniswapV3FlashCallback] remainingDebt:", remainingDebt);

        // Mint Cash
        console.log("[uniswapV3FlashCallback] Minting CASH");
        IERC20(USDC).approve(address(CASHVault), decoded.borrowedAmount);
        CASHVault.mint(USDC, decoded.borrowedAmount, decoded.borrowedAmount);        // TODO: Add flag to control _minimumCashAmount


        // Swap CASH to USDC
        console.log("[uniswapV3FlashCallback] Swapping CASH to USDT");
        uint256 balanceCASH = IERC20(CASH).balanceOf(address(this));
        IERC20(CASH).approve(address(retroRouter), balanceCASH);
        uint256 balanceUSDC = retroRouter.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: CASH,
                tokenOut: USDC,
                fee: 100,
                recipient: address(this),
                deadline: block.timestamp + 200,
                amountIn: balanceCASH,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));

        if (remainingDebt > balanceUSDC) {
            revert("Not enough to repay");
        }
        // Repay
        console.log("[uniswapV3FlashCallback] Repaying");
        IERC20(USDC).safeTransfer(address(loanPool), remainingDebt);
    }
}