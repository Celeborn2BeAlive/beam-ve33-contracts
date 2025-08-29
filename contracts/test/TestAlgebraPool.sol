// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "contracts/interfaces/IPairInfo.sol";

contract TestAlgebraPool is IPairInfo {
    address public token0;
    address public token1;
    address public communityVault;
    address public plugin;

    constructor(address _token0, address _token1) {
        token0 = _token0;
        token1 = _token1;
        plugin = address(new TestAlgebraPlugin());
    }

    function setCommunityVault(address _communityVault) external {
        communityVault = _communityVault;
    }
}

contract TestAlgebraPlugin {}
