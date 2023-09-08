//SPDX-License-Identifier: MIT
pragma solidity >=0.5.0 <0.8.0;

import "@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol";
import "@uniswap/v3-periphery/contracts/libraries/OracleLibrary.sol";

interface IERC20 {
    function balanceOf(address) external view returns(uint256);
}

contract UniswapV3TwalCash {

    IERC20 public cash;

    constructor(
        address _cash
    ) {
        cash = IERC20(_cash);
    }

    function estimateCashLiquidity(
        address pool,
        uint32 secondsAgo
    ) external view returns (uint256) {
        int24 arithmeticMeanTick;
        uint128 harmonicMeanLiquidity;

        // (int24 tick, ) = OracleLibrary.consult(pool, secondsAgo);

        // Code copied from OracleLibrary.sol, consult()
        uint32[] memory secondsAgos = new uint32[](2);
        secondsAgos[0] = secondsAgo;
        secondsAgos[1] = 0;

        (int56[] memory tickCumulatives, uint160[] memory secondsPerLiquidityCumulativeX128s) =
            IUniswapV3Pool(pool).observe(secondsAgos);

        int56 tickCumulativesDelta = tickCumulatives[1] - tickCumulatives[0];
        uint160 secondsPerLiquidityCumulativesDelta =
            secondsPerLiquidityCumulativeX128s[1] - secondsPerLiquidityCumulativeX128s[0];

        arithmeticMeanTick = int24(tickCumulativesDelta / secondsAgo);
        // Always round to negative infinity
        if (tickCumulativesDelta < 0 && (tickCumulativesDelta % secondsAgo != 0)) arithmeticMeanTick--;

        // We are multiplying here instead of shifting to ensure that harmonicMeanLiquidity doesn't overflow uint128
        uint192 secondsAgoX160 = uint192(secondsAgo) * type(uint160).max;
        harmonicMeanLiquidity = uint128(secondsAgoX160 / (uint192(secondsPerLiquidityCumulativesDelta) << 32));

        uint256 balance = cash.balanceOf(pool);
        uint256 currentLiq = IUniswapV3Pool(pool).liquidity();

        return harmonicMeanLiquidity * balance / currentLiq;
    }
}
