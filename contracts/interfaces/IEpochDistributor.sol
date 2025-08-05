// SPDX-License-Identifier: MIT
pragma solidity 0.8.13;

interface IEpochDistributor {
    function notifyRewardAmount(uint amount) external;
}
