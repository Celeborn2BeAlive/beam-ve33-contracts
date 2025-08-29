// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./TestAlgebraPool.sol";

contract TestAlgebraFactory is AccessControl, Ownable {
    mapping(address token0 => mapping(address token1 => address pool)) public poolByPair;

    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
    }

    function hasRoleOrOwner(bytes32 role, address account) public view returns (bool) {
        return (owner() == account || super.hasRole(role, account));
    }

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
