// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface IVault {
    function redeem(uint256 _amount, uint256 _minimumUnitAmount) external;
}