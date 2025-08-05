// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IEpochDistributor {
    function notifyRewardAmount(uint amount) external;
}
