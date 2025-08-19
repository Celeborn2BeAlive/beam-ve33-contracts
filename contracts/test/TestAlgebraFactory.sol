// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "./TestAlgebraPool.sol";

contract TestAlgebraFactory {
    mapping(address token0 => mapping(address token1 => address pool)) public poolByPair;

    function createPool(address tokenA, address tokenB) external returns (address pool) {
        require(tokenA != tokenB);
        (address token0, address token1) = tokenA < tokenB ? (tokenA, tokenB) : (tokenB, tokenA);
        require(token0 != address(0));
        require(poolByPair[token0][token1] == address(0));

        pool = address(new TestAlgebraPool(token0, token1));
        poolByPair[token0][token1] = pool;
        poolByPair[token1][token0] = pool;
        return pool;
    }
}
