// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "./interfaces/IMinter.sol";
import "./interfaces/IVoter.sol";
import "./interfaces/IVotingEscrow.sol";
import "./interfaces/IVotingIncentivesFactory.sol";
import "./interfaces/IVotingIncentives.sol";

/// @title Voting Incentives
/// @author Prometheus - Perseus, ThenaFi $THE
/// @author c2ba - Beam Team, forked and adapted
/// @notice Voting Incentives contract for veNFT voters. It manages fees and external incentives.
contract VotingIncentives is ReentrancyGuard, IVotingIncentives, Pausable {
    using SafeERC20 for IERC20;

    /* ========== STATE VARIABLES ========== */

    uint256 public constant WEEK = 7 days; // rewards are released over 7 days
    uint256 public constant PRECISION = 1e24;
    uint256 public firstBribeTimestamp;

    /// @notice list of reward tokens
    address[] public rewardTokens;
    /// @notice underlying feeDistributor linked to this contract
    address public feeDistributor;
    // => allows to split rewards between external incentives (bribes) and internal incentives (swap fees)
    // when everything is deployed with GlobalFactory, should be the gauge, which provide the mechanic to claim and distribute
    // swap fees to VotingIncentives in `claimFees` functions, see Gauge.sol & GaugeEternalFarming.sol

    /// @notice VotingIncentives deployer, which is also the owner (has priviledged access to admin functions)
    IVotingIncentivesFactory public votingIncentivesFactory;

    // owner -> reward token -> lastTime
    mapping(address => mapping(address => uint256)) public userRewardPerTokenPaid;
    mapping(address => mapping(address => uint256)) public userTimestamp;

    //uint256 private _totalSupply;
    mapping(uint256 => uint256) private _totalSupply;
    mapping(address => mapping(uint256 => uint256)) private _balances; //owner -> timestamp -> amount

    // token -> startTimestamp -> Reward
    mapping(address => mapping(uint => Reward)) public rewardData;
    mapping(address => bool) public isRewardToken;

    /* ========== CONSTRUCTOR ========== */

    /// @notice Deploy VotingIncentives.sol
    /// @param _feeDistributor   the feeDistributor linked with this incentive contract (the gauge)
    constructor(address _feeDistributor) {
        votingIncentivesFactory = IVotingIncentivesFactory(msg.sender);
        feeDistributor = _feeDistributor;
    }

    function voter() public view returns (IVoter) {
        return IVoter(votingIncentivesFactory.voter());
    }

    function votingEscrow() public view returns (IVotingEscrow) {
        return IVotingEscrow(votingIncentivesFactory.votingEscrow());
    }

    function minter() public view returns (IMinter) {
        return IMinter(votingIncentivesFactory.minter());
    }

    function claimer() public view returns (address) {
        return votingIncentivesFactory.claimer();
    }

    /// @notice get the current epoch
    function getEpochStart() public view returns(uint){
        return minter().active_period();
    }

    /// @notice get next epoch (where bribes are saved)
    function getNextEpochStart() public view returns(uint){
        return minter().active_period() + WEEK;
    }

    function isEpochFlipRequired() public view returns(bool) {
        return minter().is_period_updated() == false;
    }


    /* ========== VIEWS ========== */

    /// @notice get the length of the reward tokens
    function rewardsListLength() external view returns(uint256) {
        return rewardTokens.length;
    }

    /// @notice get the last totalSupply (total votes for a pool)
    function totalSupply() external view returns (uint256) {
        return _totalSupply[getEpochStart()];
    }

    /// @notice get a totalSupply given a timestamp
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256) {
        return _totalSupply[_timestamp];
    }

    /// @notice read the balanceOf the tokenId at a given timestamp
    function balanceOfAt(uint256 tokenId, uint256 _timestamp) external view returns (uint256) {
        address _owner = votingEscrow().ownerOf(tokenId);
        return _balances[_owner][_timestamp];
    }


    /// @notice get last deposit available given a tokenID
    function balanceOf(uint256 tokenId) external view returns (uint256) {
        address _owner = votingEscrow().ownerOf(tokenId);
        return _balances[_owner][getEpochStart()];
    }

    /// @notice get the balance of a owner in the current epoch
    function balanceOfOwner(address _owner) external view returns (uint256) {
        return _balances[_owner][getEpochStart()];
    }

    /// @notice get the balance of a owner given a timestamp
    function balanceOfOwnerAt(address _owner, uint256 _timestamp) external view returns (uint256) {
        return _balances[_owner][_timestamp];
    }


    /// @notice Read earned amount given a tokenID and _token
    function earned(uint256 tokenId, address _token) external view returns(uint256){
        uint256 _endTimestamp = getEpochStart(); // claim until current epoch
        address _owner = votingEscrow().ownerOf(tokenId);
        uint256 _userLastTime = userTimestamp[_owner][_token];

        (uint reward, ) = _preEarned(_endTimestamp, _userLastTime, _token, _owner);
        return reward;
    }

    /// @notice read earned amounts given an address and the reward token
    function earned(address _owner, address _token) external view returns(uint256){
        uint256 _endTimestamp = getEpochStart(); // claim until current epoch
        uint256 _userLastTime = userTimestamp[_owner][_token];
        (uint reward, ) = _preEarned(_endTimestamp, _userLastTime, _token, _owner);
        return reward;
    }

    /// @notice read earned amounts given a tokenID and the reward token, at a specific epoch timestamp
    function earnedAtEpochTimestamp(uint256 tokenId, address _token, uint256 _timestamp) external view returns(uint256){
        address _owner = votingEscrow().ownerOf(tokenId);
        return _earned(_owner, _token, _timestamp);
    }

    /// @notice read earned amounts given an address and the reward token, at a specific epoch timestamp
    function earnedAtEpochTimestamp(address _owner, address _token, uint256 _timestamp) external view returns(uint256){
        return _earned(_owner, _token, _timestamp);
    }

    /// @notice get the rewards for token
    /// @param _token token to use
    /// @param _timestmap   timestamp of the incentive
    function rewardPerToken(address _token, uint256 _timestmap) external view returns (uint256) {
        return _rewardPerToken(_token, _timestmap);
    }

    function _rewardPerToken(address _token, uint256 _timestmap) internal view returns (uint256) {
        if (_totalSupply[_timestmap] == 0) {
            return 0;
        }
        // remove PRECISION on _earned()
        return rewardData[_token][_timestmap].rewardsPerEpoch * PRECISION / _totalSupply[_timestmap];
    }


    /* ========== USER FUNCTIONS ========== */

    /// @notice User votes deposit
    /// @dev    called on voter.vote() or voter.poke()
    ///         we save into owner "address" and not "tokenID".
    function deposit(uint256 amount, uint256 tokenId) external nonReentrant whenNotPaused {
        require(amount > 0, "VI: deposit 0");
        if(msg.sender != address(voter())) revert NotVoter();

        uint256 _startTimestamp = getEpochStart();
        address _owner = votingEscrow().ownerOf(tokenId);

        _totalSupply[_startTimestamp] += amount;
        _balances[_owner][_startTimestamp] += amount;

        emit Staked(tokenId, amount);
    }

    /// @notice User votes withdrawal
    /// @dev    called on voter.reset()
    function withdraw(uint256 amount, uint256 tokenId) external nonReentrant whenNotPaused {
        require(amount > 0, "VI: withdraw 0");
        if(msg.sender != address(voter())) revert NotVoter();

        uint256 _startTimestamp = getEpochStart() ;
        address _owner = votingEscrow().ownerOf(tokenId);
        require(amount <= _balances[_owner][_startTimestamp],'VI: !user balance');

        _totalSupply[_startTimestamp] -= amount;
        _balances[_owner][_startTimestamp] -= amount;
        emit Withdrawn(tokenId, amount);

    }

    /// @notice Claim the TOKENID rewards
    function getReward(uint tokenId, address[] calldata tokens) external nonReentrant whenNotPaused {
        require(votingEscrow().isApprovedOrOwner(msg.sender, tokenId));
        uint256 _userLastTime;
        uint256 reward;
        uint256 i;
        address _owner = votingEscrow().ownerOf(tokenId);

        for (i; i < tokens.length; i++) {
            address _token = tokens[i];
            (reward, _userLastTime) = _earnedWithTimestamp(_owner, _token);
            if (reward > 0) {
                IERC20(_token).safeTransfer(_owner, reward);
                emit RewardPaid(_owner, _token, reward);
            }
            userTimestamp[_owner][_token] = _userLastTime;
        }
    }

    /// @notice Claim the rewards given msg.sender
    function getReward(address[] calldata tokens) external nonReentrant whenNotPaused {
        uint256 _userLastTime;
        uint256 reward;
        address _owner = msg.sender;
        uint256 i;

        for (i; i < tokens.length; i++) {
            address _token = tokens[i];
            (reward, _userLastTime) = _earnedWithTimestamp(_owner, _token);
            if (reward > 0) {
                IERC20(_token).safeTransfer(_owner, reward);
                emit RewardPaid(_owner, _token, reward);
            }
            userTimestamp[_owner][_token] = _userLastTime;
        }
    }

    /// @notice Claim rewards from claimer
    function getRewardForOwner(uint tokenId, address[] calldata tokens) external nonReentrant whenNotPaused {
        if(msg.sender != claimer()) revert NotClaimer();

        uint256 _userLastTime;
        uint256 reward;
        uint256 i;
        address _owner = votingEscrow().ownerOf(tokenId);

        for (i; i < tokens.length; i++) {
            address _token = tokens[i];
            (reward, _userLastTime) = _earnedWithTimestamp(_owner, _token);
            if (reward > 0) {
                IERC20(_token).safeTransfer(_owner, reward);
                emit RewardPaid(_owner, _token, reward);
            }
            userTimestamp[_owner][_token] = _userLastTime;
        }
    }

    /// @notice Claim rewards from claimer
    function getRewardForAddress(address _owner, address[] calldata tokens) external nonReentrant whenNotPaused {
        if(msg.sender != claimer()) revert NotClaimer();

        uint256 _userLastTime;
        uint256 reward;
        uint256 i;

        for (i; i < tokens.length; i++) {
            address _token = tokens[i];
            (reward, _userLastTime) = _earnedWithTimestamp(_owner, _token);
            if (reward > 0) {
                IERC20(_token).safeTransfer(_owner, reward);
                emit RewardPaid(_owner, _token, reward);
            }
            userTimestamp[_owner][_token] = _userLastTime;
        }
    }

    /// @notice Notify reward for multiple epochs
    /// @param _token   the token to send
    /// @param _rewards the reward amounts for each epoch
    function notifyRewardAmountForMultipleEpoch(address _token, uint256[] calldata _rewards) external nonReentrant whenNotPaused {
        require(isRewardToken[_token], "reward token not verified");
        if (isEpochFlipRequired()) revert EpochFlipRequired();

        uint256 _startTimestamp = getEpochStart();
        uint256 i;
        uint256 totalReward;
        uint256 numOfEpochs = _rewards.length;

        for(i ; i < numOfEpochs; ){
            totalReward += _rewards[i];
            _notifyReward(_token, _rewards[i], _startTimestamp + WEEK * i, false);
            unchecked{i++;}
        }

        require(totalReward > 0, 'zero rewards');
        IERC20(_token).safeTransferFrom(msg.sender,address(this),totalReward);
    }


    /// @notice Notify a bribe amount
    /// @dev    Rewards are saved into THIS EPOCH mapping.
    function notifyRewardAmount(address _token, uint256 reward) external nonReentrant whenNotPaused {
        require(isRewardToken[_token], "reward token not verified");
        if (isEpochFlipRequired()) revert EpochFlipRequired();

        uint256 _startTimestamp = getEpochStart();
        _notifyReward(_token, reward, _startTimestamp, msg.sender == feeDistributor);
        IERC20(_token).safeTransferFrom(msg.sender,address(this),reward);
    }

    function _notifyReward(address _token, uint256 reward, uint256 timestamp, bool isFee) internal {
        if(firstBribeTimestamp == 0){
            firstBribeTimestamp = timestamp;
        }

        isFee ? rewardData[_token][timestamp].feesAmount += reward : rewardData[_token][timestamp].incentivesAmount += reward;
        rewardData[_token][timestamp].rewardsPerEpoch += reward;
        rewardData[_token][timestamp].lastUpdateTime = block.timestamp;
        rewardData[_token][timestamp].periodFinish = timestamp + WEEK - 1;

        emit RewardAdded(_token, reward, timestamp);
    }




    /* ========== INTERNAL FUNCTIONS ========== */
    /// @notice Read earned amount given address and reward token, returns the rewards and the last user timestamp (used in case user do not claim since 50+epochs)
    function _earnedWithTimestamp(address _owner, address _token) internal view returns(uint256,uint256){
        uint256 _endTimestamp = getEpochStart(); // claim until current epoch
        uint256 _userLastTime = userTimestamp[_owner][_token];
        return _preEarned(_endTimestamp, _userLastTime, _token, _owner);
    }

    function _preEarned(uint256 _endTimestamp, uint256 _userLastTime, address _token, address _owner) internal view returns(uint256,uint256) {
        uint256 reward;
        if(_endTimestamp == _userLastTime){
            return (0,_userLastTime);
        }
        // if user first time then set it to first bribe avoid any timestamp problem
        if(_userLastTime < firstBribeTimestamp){
            _userLastTime = firstBribeTimestamp;
        }

        uint k = 0;
        for(k; k < 52; k++){
            if(_endTimestamp == _userLastTime){
                // if we reach the current epoch, exit
                break;
            }
            reward += _earned(_owner, _token, _userLastTime);
            _userLastTime += WEEK;
        }
        return (reward, _userLastTime);
    }

    /// @notice get the earned rewards
    function _earned(address _owner, address _token, uint256 _timestamp) internal view returns (uint256) {
        uint256 _balance = _balances[_owner][_timestamp];
        if(_balance == 0){
            return 0;
        } else {
            uint256 _rpt = _rewardPerToken(_token, _timestamp);
            uint256 _rewards = _rpt * _balance / PRECISION;
            return _rewards;
        }
    }

    /* ========== RESTRICTED FUNCTIONS ========== */

    /// @notice add rewards tokens
    function addRewards(address[] calldata _tokens) external onlyVotingIncentivesFactory {
        require(_tokens.length > 0, 'VI: length');
        uint i;
        for(i; i < _tokens.length; i++){
           _addReward(_tokens[i]);
        }
    }

    /// @notice add a single reward token
    function addReward(address _token) external onlyVotingIncentivesFactory {
        _addReward(_token);
    }
    function _addReward(address _token) internal {
        if(!isRewardToken[_token] && _token != address(0)){
            isRewardToken[_token] = true;
            rewardTokens.push(_token);
        }
    }


    /// @notice Remove rewards tokens
    function removeRewards(address[] calldata _tokens) external onlyVotingIncentivesFactory {
        require(_tokens.length > 0, 'VI: length');
        uint i;
        for(i; i < _tokens.length; i++){
           _removeReward(_tokens[i]);
        }
    }

    /// @notice Remove a single reward token
    function removeReward(address _token) external onlyVotingIncentivesFactory {
        _removeReward(_token);
    }

    function _removeReward(address _token) internal {
        if(isRewardToken[_token]){
            isRewardToken[_token] = false;
            _deleteToken(_token);
        }
    }

    function _deleteToken(address _token) private {
        uint256 len = rewardTokens.length;
        uint256 i = 0;
        for(i; i < len; i++) {
            if(rewardTokens[i] == _token){
                if(i != len-1) rewardTokens[i] = rewardTokens[len - 1];
                rewardTokens.pop();
                break;
            }
        }
    }



    /// @notice Recover ERC20 from last bribe
    function recoverERC20AndUpdateLastIncentive(address _token, uint256 tokenAmount) external onlyVotingIncentivesFactory {
        require(tokenAmount <= IERC20(_token).balanceOf(address(this)));
        uint timestamp = getEpochStart();
        rewardData[_token][timestamp].incentivesAmount -= tokenAmount;
        rewardData[_token][timestamp].rewardsPerEpoch -= tokenAmount;
        rewardData[_token][timestamp].lastUpdateTime = block.timestamp;
        emit Recovered(_token, tokenAmount);
    }

    /// @notice Recover some ERC20 from the contract.
    /// @dev    Be careful --> if called then getReward() will fail because some reward are missing !
    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount, address recipient) external onlyVotingIncentivesFactory {
        require(tokenAmount <= IERC20(tokenAddress).balanceOf(address(this)));
        IERC20(tokenAddress).safeTransfer(recipient, tokenAmount);
        emit Recovered(tokenAddress, tokenAmount);
    }

    /// @notice Set a new VotingIncentivesFactory
    function setVotingIncentivesFactory(address _votingIncentivesFactory) external onlyVotingIncentivesFactory {
        require(_votingIncentivesFactory != address(0));
        votingIncentivesFactory = IVotingIncentivesFactory(_votingIncentivesFactory);
        emit SetVotingIncentivesFactory(_votingIncentivesFactory);
    }



    /// @notice Pause contract
    /// @param status   true = pause, false = unpause
    function pause(bool status) external onlyVotingIncentivesFactory {
        status ? _pause() : _unpause();
    }


    /* ========== MODIFIERS ========== */

    modifier onlyVotingIncentivesFactory() {
        if (msg.sender != address(votingIncentivesFactory)) revert NotVotingIncentivesFactory();
        _;
    }


}
