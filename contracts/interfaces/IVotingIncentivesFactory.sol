// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


interface IVotingIncentivesFactory {
    /// @notice Read all voting incentives contract deployed
    function votingIncentives() external view returns (address[] memory);

    // Protocol contracts, access is centralized for all deployed VotingIncentives instances
    function minter() external view returns (address);
    function setMinter(address _minter) external;
    function votingEscrow() external view returns (address);
    function setVotingEscrow(address _votingEscrow) external;
    function voter() external view returns (address);
    function setVoter(address _voter) external;
    function claimer() external view returns (address);
    function setClaimer(address _claimer) external;

    // Management functions
    function setGlobalFactory(address _gf) external;
    function pushDefaultRewardToken(address _token) external;
    function removeDefaultRewardToken(address _token) external;

    // Reward token management
    function addRewardToVotingIncentives(address _token, address _vi) external;
    function addRewardsToVotingIncentives(address[] calldata _token, address _vi) external;
    function removeRewardToVotingIncentives(address _token, address _vi) external;
    function removeRewardsToVotingIncentives(address[] calldata _token, address _vi) external;

    // Voting incentives management
    function setVotingIncentivesFactory(address[] calldata _vi, address _votingIncentivesFactory) external;

    // Emergency recovery
    function emergencyRecoverERC20(address[] calldata _vi, address[] calldata _tokens, uint[] calldata _amounts) external;
    function recoverERC20AndUpdateData(address[] calldata _vi, address[] calldata _tokens, uint[] calldata _amounts) external;

    // Pause/unpause incentives
    function pauseVotingIncentives(address[] calldata _vi) external;
    function unpauseVotingIncentives(address[] calldata _vi) external;

    // Creation of voting incentives
    function createVotingIncentives(
        address _token0,
        address _token1,
        address gauge
    ) external returns (address);

    error AddressZero();
}
