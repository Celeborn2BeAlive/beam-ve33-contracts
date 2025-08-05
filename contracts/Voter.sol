// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "./interfaces/IMinter.sol";
import "./interfaces/IVotingEscrow.sol";
import "./interfaces/IVoter.sol";
import "./interfaces/IVotingIncentives.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

contract Voter is Ownable, Pausable, IVoter {


    /* =========================== */
    /* =========================== */
    /* ========== STACK ========== */
    /* =========================== */
    /* =========================== */

    /* ========== IMMUTABLES ========== */

    /* ========== CONSTANTS ========== */
    uint256 internal constant WEEK = 7 days;
    uint256 internal constant MAX_SINGLE_WEIGHT = 10000;

    /* ========== (U)INTEGERS ========== */

    /* ========== ADDRESSES ========== */
    address[] internal _pool;

    /* ========== MAPPINGS ========== */
    /// @notice Map tokenId => timestamp => votes
    mapping(uint256 => mapping(uint256 => TokenIdVote)) internal _tokenIdVotes;

    /// @notice Map timestamp => totalWeight
    mapping(uint256 => uint256) internal _totalWeights;

    /// @notice Map pool => timestamp => weights
    mapping(address => mapping(uint256 => uint256)) internal _poolTotalWeights;

    /// @notice Map pool => poolInfo.
    mapping(address => PoolData) internal _poolData;

    /// @notice Map pool => position in array
    mapping(address => uint) internal _poolPosition;

    /// @notice Map pool => boolean. Return true if pool exists
    mapping(address => bool) internal _isPool;

    /// @notice Map manager => bool. Return true if is a Manager
    mapping(address => bool) internal _isManager;

    /* ========== INTERFACES ========== */
    /// @notice EmissionToken Minter interface
    IMinter internal _minter;

    /// @notice Voting Escrow Interface
    IVotingEscrow internal _ve;


    /* ===================================== */
    /* ===================================== */
    /* ========== INIT AND DEPLOY ========== */
    /* ===================================== */
    /* ===================================== */
    constructor(address __ve, address __minter) {
        if(__ve == address(0)) revert AddressZero();
        if(__minter == address(0)) revert AddressZero();

        _ve = IVotingEscrow(__ve);
        _minter = IMinter(__minter);

        _isManager[owner()] = true;
    }


    /* ==================================== */
    /* ==================================== */
    /* ========== USER FUNCTIONS ========== */
    /* ==================================== */
    /* ==================================== */

    /// @notice Vote again with tokenID using past epoch data
    /// @param _tokenId veNFT tokenID used to revote
    /// @dev    We load the LAST epoch data from memory (epochs lasts 1 week).
    ///         We do not call _vote() to avoid removing calldata.
    function poke(uint256 _tokenId) external whenNotPaused {
        if(!_ve.isApprovedOrOwner(msg.sender, _tokenId)) revert NotOwnerOrApproved();

        uint256 _currEpochTime = _epochTimestamp();
        TokenIdVote memory tiv = _tokenIdVotes[_tokenId][_currEpochTime - WEEK];
        address[] memory _pools = tiv.pools;
        uint256[] memory _weights = tiv.weights;
        if(_pools.length == 0) revert NoVotesAvailable(_currEpochTime - WEEK);

        _reset(_tokenId);
        uint256 _totWgts = tiv.totalWeight;
        uint256 _weight = _ve.balanceOfNFT(_tokenId);
        uint256 i;
        uint256 _poolWeight;
        PoolData memory _poolDataTemp;

        if(_totWgts == 0) revert TotalWeightZero();

        for(i; i < _pools.length; i++){
            if(!_isPool[_pools[i]]) revert NotPool(_pools[i]);
            _poolWeight = _weights[i] * _weight / _totWgts;
            if(_poolWeight == 0) revert PoolWeightZero();
            _poolTotalWeights[_pools[i]][_currEpochTime] += _poolWeight;
            _poolDataTemp = _poolData[_pools[i]];
            IVotingIncentives(_poolDataTemp.votingIncentives).deposit(_poolWeight, _tokenId);
        }

        _tokenIdVotes[_tokenId][_currEpochTime] = TokenIdVote({
            veBalance: _weight,
            totalWeight: _totWgts,
            weights: _weights,
            pools: _pools
        });

        _totalWeights[_currEpochTime] += _weight;
        _ve.voting(_tokenId);
        emit Vote(msg.sender, _tokenId, _currEpochTime);
    }


    /// @notice Reset the votes of a position
    /// @param _tokenId veNFT tokenID
    function reset(uint256 _tokenId) external whenNotPaused {
        if(!_ve.isApprovedOrOwner(msg.sender, _tokenId)) revert NotOwnerOrApproved();
        _reset(_tokenId);
    }


    function _reset(uint256 _tokenId) internal {
        uint256 _currEpochTime = _epochTimestamp();
        TokenIdVote memory tiv = _tokenIdVotes[_tokenId][_currEpochTime];
        PoolData memory _poolDataTemp;

        if(tiv.totalWeight != 0) {
            _totalWeights[_currEpochTime] -= tiv.veBalance;
            uint256 _poolWeight;
            uint256 i;
            for(i; i < tiv.pools.length; i++){
                _poolWeight = tiv.weights[i] * tiv.veBalance / tiv.totalWeight;
                _poolTotalWeights[tiv.pools[i]][_currEpochTime] -= _poolWeight;
                _poolDataTemp = _poolData[tiv.pools[i]];
                IVotingIncentives(_poolDataTemp.votingIncentives).withdraw(_poolWeight, _tokenId);
            }
            delete _tokenIdVotes[_tokenId][_currEpochTime];
        }
        _ve.abstain(_tokenId);
        emit Reset(msg.sender, _tokenId, _currEpochTime);
    }

    /// @notice Vote a given pool to earn rewards
    /// @param _tokenId veNFT tokenID
    /// @param _pools   array with pools to vote
    /// @param _weights array with weights for each pool
    /// @dev Pool_vote_wieght = User NFT Balance * _weights[i] / sumOfWeights;
    function vote(uint256 _tokenId, address[] calldata _pools, uint256[] calldata _weights) external whenNotPaused {
        if(!_ve.isApprovedOrOwner(msg.sender, _tokenId)) revert NotOwnerOrApproved();
        if(_pools.length != _weights.length) revert InputMismatch();
        _vote(_tokenId, _pools, _weights);
    }

    function _vote(uint256 _tokenId, address[] calldata _pools, uint256[] calldata _weights) internal {
        _reset(_tokenId);

        uint256 _totWgts;
        uint256 _weight = _ve.balanceOfNFT(_tokenId);
        uint256 _currEpochTime = _epochTimestamp();
        uint256 i;
        uint256 _poolWeight;
        uint256 _totVoteWeights;

        for(i = 0; i < _pools.length; i++){
            if(!_isPool[_pools[i]]) revert NotPool(_pools[i]);
            _totWgts += _weights[i];
        }

        if(_totWgts == 0) revert TotalWeightZero();

        for(i = 0; i < _pools.length; i++){
            if(_weights[i] > MAX_SINGLE_WEIGHT) revert MaxSingleWeight();
            _poolWeight = _weights[i] * _weight / _totWgts;
            if(_poolWeight == 0) revert PoolWeightZero();
            _totVoteWeights += _poolWeight;

            _poolTotalWeights[_pools[i]][_currEpochTime] += _poolWeight;

            IVotingIncentives(_poolData[_pools[i]].votingIncentives).deposit(_poolWeight, _tokenId);
        }

        _tokenIdVotes[_tokenId][_currEpochTime] = TokenIdVote({
            veBalance: _weight,
            totalWeight: _totWgts,
            weights: _weights,
            pools: _pools
        });
        _totalWeights[_currEpochTime] += _weight;
        _ve.voting(_tokenId);

        emit Vote(msg.sender, _tokenId, _currEpochTime);
    }





    /* ====================================== */
    /* ====================================== */
    /* ========== SETTER FUNCTIONS ========== */
    /* ====================================== */
    /* ====================================== */

    /// @notice Add pool information to the voter
    /// @param pool     pool to be added
    /// @param gauge    gauge linked to the pool
    /// @param votingIncentives     voting incentives linked to the pool
    /// @dev can be called only from a Manager (factories)
    function addPoolData(address pool, address gauge, address votingIncentives) external {
        if(!_onlyManager(msg.sender)) revert NotManager();
        if(pool == address(0)) revert AddressZero();
        if(gauge == address(0)) revert AddressZero();
        if(votingIncentives == address(0)) revert AddressZero();
        if(_isPool[pool]) revert PoolExists();

        _poolData[pool] = PoolData({
            gauge: gauge,
            votingIncentives: votingIncentives
        });
        _isPool[pool] = true;
        _pool.push(pool);
        _poolPosition[pool] = _pool.length - 1;

        // If pool was removed then added again, we have some weight.
        uint256 timestamp = _epochTimestamp();
        uint256 _totWghts = _poolTotalWeights[pool][timestamp];
        if(_totWghts > 0) _totalWeights[timestamp] += _totWghts;

        emit AddPool(pool, gauge, votingIncentives);
    }

    /// @notice Remove a pool information from the voter
    /// @param pool     pool to be added
    /// @dev can be called only from a Manager
    function removePoolData(address pool) external {
        if(!_onlyManager(msg.sender)) revert NotManager();
        if(!_isPool[pool]) revert PoolNotExists();

        // remove weights if any
        uint256 timestamp = _epochTimestamp();
        uint256 _totWghts = _poolTotalWeights[pool][timestamp];
        if(_totWghts > 0) _totalWeights[timestamp] -= _totWghts;

        address _lastPool = _pool[_pool.length -1];
        uint _tempPos = _poolPosition[pool];
        _pool[_tempPos] = _lastPool;
        delete _poolPosition[pool];
        _poolPosition[_lastPool] = _tempPos;
        _pool.pop();

        _isPool[pool] = false;

        emit RemovePool(pool);
    }

    /// @notice Ban a pool from voting
    /// @param pool pool to ban
    function banPool(address pool) external {
        if(!_onlyManager(msg.sender)) revert NotManager();
        if(!_isPool[pool]) revert PoolNotExists();
        _isPool[pool] = false;
        emit BanPool(pool);
    }

    /// @notice Revive a pool from voting
    /// @param pool pool to ban
    function revivePool(address pool) external {
        if(!_onlyManager(msg.sender)) revert NotManager();
        if(_isPool[pool]) revert PoolExists();
        _isPool[pool] = true;
        emit RevivePool(pool);
    }


    /// @notice Set new Voting Escrow
    /// @param _votingEscrow Voting Escrow Contract
    function setVotingEscrow(address _votingEscrow) external {
        if(!_onlyManager(msg.sender)) revert NotManager();
        if(_votingEscrow == address(0)) revert AddressZero();
        _ve = IVotingEscrow(_votingEscrow);
        emit SetVotingEscrow(_votingEscrow);
    }

    /// @notice Set new Minter
    /// @param _mint Minter Contract
    function setMinter(address _mint) external {
        if(!_onlyManager(msg.sender)) revert NotManager();
        if(_mint == address(0)) revert AddressZero();
        _minter = IMinter(_mint);
        emit SetMinter(_mint);
    }

    /// @notice Set the status of a manager address
    /// @param manager manager address
    /// @param status  boolean (true = active)
    function setManagerStatus(address manager, bool status) external onlyOwner {
        if(manager == address(0)) revert AddressZero();
        _isManager[manager] = status;
        emit SetManagerStatus(manager, status);
    }


    /// @notice Pause contract
    /// @param status   true = pause, false = unpause
    function pause(bool status) external onlyOwner {
        status ? _pause() : _unpause();
    }



    /* =============================================== */
    /* =============================================== */
    /* ========== INTERNAL HELPER FUNCTIONS ========== */
    /* =============================================== */
    /* =============================================== */

    function _onlyManager(address manager) internal view returns(bool){
        return _isManager[manager];
    }





    /* ==================================== */
    /* ==================================== */
    /* ========== VIEW FUNCTIONS ========== */
    /* ==================================== */
    /* ==================================== */

    /// @notice get the current epoch's timestamp
    function epochTimestamp() external view returns(uint256) {
        return _epochTimestamp();
    }

    function _epochTimestamp() internal view returns(uint256) {
        return _minter.active_period();
    }

    /// @notice Read the vote data of a tokenID at a given timestamp
    function tokenIdVotes(uint256 _tokenId, uint256 timestamp) external view returns(TokenIdVote memory){
        return _tokenIdVotes[_tokenId][timestamp];
    }

    /// @notice Read the total votes at a given timestamp
    function totalWeights(uint256 timestamp) external view returns(uint256){
        return _totalWeights[timestamp];
    }

    /// @notice Read the total votes of a pool at a given timestamp
    function poolTotalWeights(address pool, uint256 timestamp) external view returns(uint256){
        return _poolTotalWeights[pool][timestamp];
    }

    /// @notice Read the Pool data (gauge and votingIncentives)
    function poolData(address pool) external view returns(PoolData memory){
        return _poolData[pool];
    }

    /// @notice Check wheter a pool is allowed to be voted
    function isPool(address pool) external view returns(bool){
        if(_isPool[pool]) return true;
        return false;
    }

    /// @notice Read all the available pool addresses
    function pools() external view returns(address[] memory){
        return _pool;
    }

    /// @notice Read the position in the _pool array of a given pool
    function poolPosition(address pool) external view returns(uint pos) {
        return _poolPosition[pool];
    }

    /// @notice Read the total length of the pool array
    function poolsLength() external view returns(uint256){
        return _pool.length;
    }

    /// @notice Read the pool array from 'from' to 'to'
    function pools(uint from, uint to) external view returns(address[] memory _pools){
        uint256 len = to - from;
        _pools = new address[](len);
        uint i;
        for(i; i < len; i++) _pools[i] = _pool[from + i];

    }

    /// @notice Read a pool address given the position in the array
    function pools(uint pos) external view returns(address){
        return _pool[pos];
    }

    /// @notice Read the gauge of a pool
    function gaugeForPool(address pool) external view returns(address){
        return _poolData[pool].gauge;
    }

    /// @notice Read the gauge of a pool
    function votingIncentivesForPool(address pool) external view returns(address){
        return _poolData[pool].votingIncentives;
    }

    /// @notice Check if the address is a manager
    function isManager(address manager) external view returns(bool){
        return _isManager[manager];
    }

    /// @notice Read the address of veTHE
    function ve() external view returns(address){
        return address(_ve);
    }

    /// @notice Read the address of the minter
    function minter() external view returns(address){
        return address(_minter);
    }


}
