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

contract Arb is IUniswapV3FlashCallback, Ownable {
    using SafeERC20 for IERC20;

    
    IUniswapV3Pool loanPool;
    address USDC;
    address CASH;
    address DAI;
    address USDT;
    ISwapRouter retroRouter;
    ISwapRouter uniswapRouter;
    address addressDripper;
    address addressA;
    address addressB;

    IVault CASHVault;
    bool USDCIsToken0; // USDC number in loanPool
    

    event Earned(uint256 amount, bool movePriceUp);
    event Distributed(uint256 amountDripper, uint256 amountAB);

    constructor(IUniswapV3Pool _loanPool, address _USDC, address _CASH, address _DAI, address _USDT, ISwapRouter _retroRouter, ISwapRouter _uniswapRouter, address _addressDripper, address _addressA, address _addressB) {
        USDC = _USDC;
        CASH = _CASH;
        DAI = _DAI;
        USDT = _USDT;

        CASHVault = IVault(ICash(CASH).vaultAddress());

        setConfig(_loanPool, _retroRouter, _uniswapRouter, _addressDripper, _addressA, _addressB);
    }

    function setConfig(IUniswapV3Pool _loanPool, ISwapRouter _retroRouter, ISwapRouter _uniswapRouter, address _addressDripper, address _addressA, address _addressB) public onlyOwner() {
        loanPool = _loanPool;
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
    }

    struct FlashCallbackData {
        uint256 borrowedAmount;
        bool movePriceUp;
    }

    function work(uint256 amountIn, bool movePriceUp) public onlyOwner returns(uint256 profit) {
        uint256 balanceBefore = IERC20(USDC).balanceOf(address(this));
        loanPool.flash(
            address(this),
            USDCIsToken0 ? amountIn : 0,
            USDCIsToken0 ? 0 : amountIn,
            abi.encode(FlashCallbackData({
                borrowedAmount: amountIn,
                movePriceUp: movePriceUp
            }))
            );
        

        uint256 balanceAfter = IERC20(USDC).balanceOf(address(this));

        require(balanceAfter > balanceBefore, "No profit");
        profit = balanceAfter - balanceBefore;
        emit Earned(profit, movePriceUp);
    }

    function distributeProfits() public onlyOwner {
        uint256 amountToDistribute = IERC20(USDC).balanceOf(address(this));
        uint256 amountAB = amountToDistribute*15/100;
        uint256 amountDripper = amountToDistribute - 2*amountAB;

        IERC20(USDC).safeTransfer(addressA, amountAB);
        IERC20(USDC).safeTransfer(addressB, amountAB);

        // Swap amountDripper USDC to USDC
        v3Swap(uniswapRouter, USDC, USDT, amountDripper, addressDripper);

        emit Distributed(amountDripper, amountAB);
    }

    function recoverERC20(address token) external onlyOwner {
        uint256 balance = IERC20(token).balanceOf(address(this));
        if (balance > 0) {
            IERC20(token).safeTransfer(msg.sender, balance);
        }
    }

    function wokrAndDistributeProfits(uint256 amountIn, bool movePriceUp) external onlyOwner {
        work(amountIn, movePriceUp);
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

        if (decoded.movePriceUp) {
            // ====================== ArbBurn ======================

            // Swap borrowed USDC to CASH
            uint256 amountCASH = v3Swap(retroRouter, USDC, CASH, decoded.borrowedAmount, address(this));

            // Burn Cash
            CASHVault.redeem(amountCASH, 0);        

            // Swap DAI to USDC
            uint256 balanceDAI = IERC20(DAI).balanceOf(address(this));
            v3Swap(uniswapRouter, DAI, USDC, balanceDAI, address(this));

            // Swap USDT to USDC
            uint256 balanceUSDT = IERC20(USDT).balanceOf(address(this));
            v3Swap(uniswapRouter, USDT, USDC, balanceUSDT, address(this));

        } else {
            // ====================== ArbMint ======================

            // Mint Cash
            IERC20(USDC).approve(address(CASHVault), decoded.borrowedAmount);
            CASHVault.mint(USDC, decoded.borrowedAmount, 0);

            // Swap CASH to USDC
            uint256 balanceCASH = IERC20(CASH).balanceOf(address(this));
            v3Swap(retroRouter, CASH, USDC, balanceCASH, address(this));
        }
            

        uint256 balanceUSDC = IERC20(USDC).balanceOf(address(this));
            
        if (remainingDebt > balanceUSDC) {
            revert("Not enough to repay");
        }
        IERC20(USDC).safeTransfer(address(loanPool), remainingDebt);
    }


    function v3Swap(ISwapRouter router, address tokenIn, address tokenOut, uint256 amountIn, address recipient) private returns (uint256 amountOut) {
        IERC20(tokenIn).approve(address(router), amountIn);


        amountOut = router.exactInputSingle(
            ISwapRouter.ExactInputSingleParams({
                tokenIn: tokenIn,
                tokenOut: tokenOut,
                fee: 100,
                recipient: recipient,
                deadline: block.timestamp + 200,
                amountIn: amountIn,
                amountOutMinimum: 0,
                sqrtPriceLimitX96: 0
            }));
    }
}