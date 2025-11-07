// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import '@cryptoalgebra/integral-farming/contracts/libraries/IncentiveId.sol';


interface IIncentiveMaker {
    function poolToKey(address pool) external returns(IncentiveKey memory key);
    function updateIncentive(address pool, uint256 reward) external;
}
