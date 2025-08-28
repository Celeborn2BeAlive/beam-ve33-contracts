// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import '@cryptoalgebra/integral-core/contracts/interfaces/IAlgebraFactory.sol';
import "./IVoter.sol";
import "./IWeightedPoolsSimple.sol";
import "./IGaugeFactory.sol";
import "./IPairFactory.sol";
import "./IVotingIncentivesFactory.sol";

interface IGlobalFactory {
    /// @dev Thrown when an address is zero
    error AddressZero();
    /// @dev Thrown when the pool type selected does not exist
    error PoolType();
    /// @dev Thrown when the pool is already in the voter
    error PoolExists();
    /// @dev Thrown when the pool address is not a contract
    error PoolIsNotAContract();
    /// @dev Thrown when the CL Algebra pool does not exist
    error NotValidPool();
    /// @dev Thrown when the token of the underlying pool is not whitelisted
    error TokenNotAllowed();
    /// @dev Thrown when the msg.sender is not allowed to call
    error NotAllowed();

    event Create(address feeVault, address indexed gauge, address votingIncentives, address indexed pool);
    event AddToken(address indexed token);
    event RemoveToken(address indexed token);
    event SetPoolTypeCreator(uint8 indexed poolType, bool status, address user);
    event SetPoolType(uint8 indexed poolType, bool status);
    event SetVoter(address indexed voter);
    event SetPairFactorySolidly(address indexed pfs);
    event SetPairFactoryAlgebra(address indexed pfa);
    event SetWeightedFactory(address indexed wf);
    event SetGaugeFactory(address indexed gf);
    event SetVotingIncentivesFactory(address indexed vif);
    event SetTreasury(address indexed treasury);
    event SetEpochDistributor(address indexed epochDistributor);
    event SetClaimer(address indexed claimer);
    event SetIncentiveMaker(address indexed incentiveMaker);

    function FEE_VAULT_MANAGER_ROLE() external view returns (bytes32);
    function GLOBAL_FACTORY_MANAGER_ROLE() external view returns (bytes32);
    function ADDR_0() external view returns (address);
    function emissionToken() external view returns (address);
    function treasury() external view returns (address);
    function claimer() external view returns (address);
    function epochDistributor() external view returns (address);
    function incentiveMaker() external view returns (address);
    function tokens(uint256) external view returns (address);
    function defaultGaugeRewardTokens(uint256) external view returns (address);

    function gaugeFactory() external view returns (IGaugeFactory);
    function votingIncentivesFactory() external view returns (IVotingIncentivesFactory);
    function pairFactorySld() external view returns (IPairFactory);
    function algebraFactory() external view returns (IAlgebraFactory);
    function weightedFactory() external view returns (IWeightedPoolsSimple);
    function voter() external view returns (IVoter);
    function isToken(address) external view returns (bool);
    function poolType(uint8) external view returns (bool);

    function create(address _pool, uint8 pool_type) external returns (address feeVault, address gauge, address votingIncentives);

    function addToken(address[] calldata _tokens) external;
    function removeToken(address[] calldata _tokens) external;
    function setPoolTypeCreator(uint8 _type, bool status, address user) external;
    function setPoolType(uint8 _type, bool status) external;
    function setVoter(address _voter) external;
    function setPairFactorySolidly(address _fact) external;
    function setPairFactoryAlgebra(address _fact) external;
    function setGaugeFactory(address _fact) external;
    function setWeightedFactory(address _fact) external;
    function setVotingIncentivesFactory(address _fact) external;
    function setTreasury(address _treasury) external;
    function setDistribution(address distro) external;
    function setClaimer(address claim) external;
    function setIncentiveMaker(address _incentivemaker) external;
    function setTreasury_feeVault(address feevault, address treasury) external;
    function setTreasuryShare_feeVault(address feevault, uint256 share) external;
    function setGauge_feeVault(address feevault, address _gauge) external;
    function allow_feeVault(address feevault, address caller, bool status) external;
    function setPool_feeVault(address feevault, address _pool) external;
    function recoverERC20_feeVault(address feevault, address _tokenAddress, uint256 _tokenAmount) external;
}
