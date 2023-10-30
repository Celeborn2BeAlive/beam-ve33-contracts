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

contract ArbBurn is IUniswapV3FlashCallback, Ownable {
    using SafeERC20 for IERC20;

    ISwapRouter retroRouter;
    ISwapRouter uniswapRouter;
    IUniswapV3Pool loanPool;
    address USDC;
    address CASH;
    address DAI;
    address USDT;
    IVault CASHVault;
    bool USDCIsToken0; // USDC number in loanPool
    address addressDripper;
    address addressA;
    address addressB;

    event Earned(uint256 amount);
    event Distributed(uint256 amountDripper, uint256 amountAB);

    constructor(IUniswapV3Pool _loanPool, address _USDC, address _CASH, address _DAI, address _USDT, ISwapRouter _retroRouter, ISwapRouter _uniswapRouter, address _addressDripper, address _addressA, address _addressB) {
        loanPool = _loanPool;
        USDC = _USDC;
        CASH = _CASH;
        if (USDC == loanPool.token0()) {
            USDCIsToken0 = true;
        } else if (USDC == loanPool.token1()) {
            USDCIsToken0 = false;
        } else {
            revert("No USDC in loanPool");
        }
        DAI = _DAI;
        USDT = _USDT;
        retroRouter = _retroRouter;
        uniswapRouter = _uniswapRouter;
        CASHVault = IVault(ICash(CASH).vaultAddress());
        addressDripper = _addressDripper;
        addressA = _addressA;
        addressB = _addressB;
    }

    struct FlashCallbackData {
        uint256 borrowedAmount;
    }

    function work(uint256 amountIn) public onlyOwner returns(uint256 profit) {
        uint256 balanceBefore = IERC20(USDC).balanceOf(address(this));
        loanPool.flash(
            address(this),
            USDCIsToken0 ? amountIn : 0,
            USDCIsToken0 ? 0 : amountIn,
            abi.encode(FlashCallbackData({
                borrowedAmount: amountIn
            }))
            );
        

        uint256 balanceAfter = IERC20(USDC).balanceOf(address(this));

        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        emit Earned(profit);
    }

    function distributeProfits() public onlyOwner {
        uint256 amountToDistribute = IERC20(USDC).balanceOf(address(this));
        uint256 amountAB = amountToDistribute*15/100;
        uint256 amountDripper = amountToDistribute - 2*amountAB;

        IERC20(USDC).safeTransfer(addressA, amountAB);
        IERC20(USDC).safeTransfer(addressB, amountAB);

        // Swap amountDripper USDC to USDC
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
        
        // Swap borrowed USDC to CASH
        uint256 amountCASH = v3Swap(retroRouter, USDC, CASH, decoded.borrowedAmount);

        // Burn Cash
        CASHVault.redeem(amountCASH, 0);        


        uint256 balanceDAI = IERC20(DAI).balanceOf(address(this));
        uint256 balanceUSDT = IERC20(USDT).balanceOf(address(this));

        v3Swap(uniswapRouter, DAI, USDC, balanceDAI);
        v3Swap(uniswapRouter, USDT, USDC, balanceUSDT);

        uint256 balanceUSDC = IERC20(USDC).balanceOf(address(this));
        
        if (remainingDebt > balanceUSDC) {
            revert("Not enough to repay");
        }
        IERC20(USDC).safeTransfer(address(loanPool), remainingDebt);
    }


    function v3Swap(ISwapRouter router, address tokenIn, address tokenOut, uint256 amountIn) private returns (uint256 amountOut) {
        IERC20(tokenIn).approve(address(router), amountIn);


        amountOut = router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 100,
                recipient: address(this),
                deadline: block.timestamp + 200,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
    }
}