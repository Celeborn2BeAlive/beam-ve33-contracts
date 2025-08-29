// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IVoter {


    // Structures
    struct TokenIdVote {
        uint256 veBalance;   // ve balance of user veNFT
        uint256 totalWeight;    // sum of weights[]
        uint256[] weights;      // weights for each pool
        address[] pools;        // pools to vote
    }

    struct PoolData {
        address gauge;              // Gauge contract for a given pool
        address votingIncentives;   // Voting Incentives contract for a given pool
    }


    // Events
    event AddPool(address indexed pool, address gauge, address votingIncentives);
    event RemovePool(address indexed pool);
    event Vote(address voter,uint256 indexed tokenId,uint256 timestamp);
    event Reset(address voter,uint256 indexed tokenId,uint256 timestamp);

    event BanPool(address indexed pool);
    event RevivePool(address indexed pool);
    event SetVotingEscrow(address indexed ve);
    event SetMinter(address indexed minter);
    event SetVotingEscrowAttach(address indexed vea);
    event SetManagerStatus(address indexed manager, bool stauts);

    // Errors
    error AddressZero();
    error NotManager();
    error NotOwnerOrApproved();
    error InputMismatch();
    error NoVotesAvailable(uint256 timestamp);
    error PoolExists();
    error PoolNotExists();
    error PoolWeightZero();
    error TotalWeightZero();
    error NotPool(address pool);
    error MaxSingleWeight();
    /// @notice Epoch flip is required before votes can be casted or reset
    error EpochFlipRequired();

    // Functions
    function addPoolData(address pool, address gauge, address votingIncentives) external;

    function poke(uint256 _tokenId) external;
    function reset(uint256 _tokenId) external;
    function vote(uint256 _tokenId, address[] calldata _pools, uint256[] calldata _weights) external;

    function epochTimestamp() external view returns(uint256);
    function tokenIdVotes(uint256 _tokenId, uint256 timestamp) external view returns(TokenIdVote memory);
    function totalWeights(uint256 timestamp) external view returns(uint256);
    function poolTotalWeights(address pool, uint256 timestamp) external view returns(uint256);
    function poolData(address pool) external view returns(PoolData memory);
    function isPool(address pool) external view returns(bool);
    function poolsLength() external view returns(uint256);
    function pools() external view returns(address[] memory);
    function pools(uint from, uint to) external view returns(address[] memory _pools);
    function pools(uint pos) external view returns(address);
    function gaugeForPool(address pool) external view returns(address);
    function votingIncentivesForPool(address pool) external view returns(address);
    function ve() external view returns(address);
    function minter() external view returns(address);
}
