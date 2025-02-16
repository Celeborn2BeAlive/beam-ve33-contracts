// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

interface ICash {
    function nonRebasingSupply() external view returns(uint256);
    function totalSupply() external view returns(uint256);
    function balanceOf(address) external view returns(uint256);
    function approve(address spender, uint256 amount) external returns (bool);
    function vaultAddress() external view returns (address);
}