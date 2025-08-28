// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IGaugeFactory {
    function createGauge(address[] memory _rewardTokens, address _token, address _feeVault, address _votingIncentives, bool isWeighted) external returns(address);
    function createEternalGauge(address _pool, address _feeVault, address _votingIncentives) external returns(address);
    function setVotingIncentives(address _gauges,  address _vi) external;
    function claimFees(address[] calldata _gauges) external;

    function epochDistributor() external view returns(address);
    function claimer() external view returns(address);
    function incentiveMaker() external view returns(address);
}
