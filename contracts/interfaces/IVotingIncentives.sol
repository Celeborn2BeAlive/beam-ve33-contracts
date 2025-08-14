// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVotingIncentives {

    struct Reward {
        uint256 periodFinish;     // when it finish
        uint256 incentivesAmount; // total amount of incentives token per epoch (Help UI)
        uint256 feesAmount;      // total amount of fees earned from LP (Help UI)
        uint256 rewardsPerEpoch; // total amount of incentives + fees
        uint256 lastUpdateTime; // last time reward was added
    }


    function getEpochStart() external view returns(uint);
    function getNextEpochStart() external view returns(uint);
    function rewardsListLength() external view returns(uint256);
    function rewardTokens(uint256) external view returns(address);
    function totalSupply() external view returns (uint256);
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256);
    function balanceOfAt(uint256 tokenId, uint256 _timestamp) external view returns (uint256);
    function balanceOf(uint256 tokenId) external view returns (uint256);
    function balanceOfOwner(address _owner) external view returns (uint256);
    function balanceOfOwnerAt(address _owner, uint256 _timestamp) external view returns (uint256);
    function earned(uint256 tokenId, address _rewardToken) external view returns(uint256);
    function earned(address _owner, address _rewardToken) external view returns(uint256);
    function rewardPerToken(address _rewardToken, uint256 _timestmap) external view returns (uint256);

    function deposit(uint256 amount, uint256 tokenId) external;
    function withdraw(uint256 amount, uint256 tokenId) external;
    function getReward(uint tokenId, address[] calldata tokens) external;
    function getReward(address[] calldata tokens) external;
    function getRewardForOwner(uint tokenId, address[] calldata tokens) external;
    function getRewardForAddress(address _owner, address[] calldata tokens) external;
    function notifyRewardAmountForMultipleEpoch(address _rewardsToken, uint256[] calldata _rewards) external;
    function notifyRewardAmount(address _rewardsToken, uint256 reward) external;

    function addReward(address) external;
    function addRewards(address[] calldata _rewardsToken) external;
    function removeReward(address) external;
    function removeRewards(address[] calldata _rewardsToken) external;
    function setVoter(address _Voter) external;
    function setMinter(address _Voter) external;
    function setOwner(address _Voter) external;
    function setClaimer(address _claimer) external;
    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external;
    function recoverERC20AndUpdateLastIncentive(address _rewardsToken, uint256 tokenAmount) external;
    function pause(bool status) external;

    // Errors
    error AddressZero();
    error NotVoter();
    error NotClaimer();

    // Events
    event RewardAdded(address rewardToken, uint256 reward, uint256 startTimestamp);
    event Staked(uint256 indexed tokenId, uint256 amount);
    event Withdrawn(uint256 indexed tokenId, uint256 amount);
    event RewardPaid(address indexed user, address indexed rewardsToken, uint256 reward);
    event Recovered(address token, uint256 amount);
    event SetVoter(address indexed voter);
    event SetMinter(address indexed minter);
    event SetOwner(address indexed owner);
    event SetClaimer(address indexed claimer);

}
