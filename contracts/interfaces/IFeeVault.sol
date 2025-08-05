// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;
interface IFeeVault {
    function claimFees() external returns(uint256 gauge0, uint256 gauge1);
}
