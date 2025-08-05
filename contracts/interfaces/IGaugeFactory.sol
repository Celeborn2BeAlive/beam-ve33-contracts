// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IGaugeFactory {
    function createGauge(address[] memory _rewardtokens,address _token,address _distribution, address _feeVault, address _votingIncentives, address _claimer, bool isWeighted) external returns(address);
    function createEternalGauge(address _pool, address _distribution, address _feeVault, address _votingIncentives, address _farming) external returns(address);
    function setVotingIncentives(address _gauges,  address _vi) external;
    function claimFees(address[] calldata _gauges) external;
}
