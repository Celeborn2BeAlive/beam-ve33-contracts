// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


interface IVotingIncentivesFactory { // View functions
    function votingIncentives() external view returns (address[] memory);

    // Management functions
    function setGlobalFactory(address _gf) external;
    function pushDefaultRewardToken(address _token) external;
    function removeDefaultRewardToken(address _token) external;

    // Reward token management
    function addRewardToVotingIncetives(address _token, address _vi) external;
    function addRewardsToVotingIncetives(address[] calldata _token, address _vi) external;
    function removeRewardToVotingIncetives(address _token, address _vi) external;
    function removeRewardsToVotingIncetives(address[] calldata _token, address _vi) external;

    // Voting incentives management
    function setVotingIncetivesVoter(address[] calldata _vi, address _voter) external;
    function setVotingIncetivesMinter(address[] calldata _vi, address _minter) external;
    function setVotingIncetivesOwner(address[] calldata _vi, address _owner) external;
    function setClaimer(address claimer, address[] calldata _vi) external;

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
        address voter,
        address gauge,
        address claimer
    ) external returns (address);


    error AddressZero();
}
