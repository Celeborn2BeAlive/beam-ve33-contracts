// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import '@cryptoalgebra/integral-core/contracts/interfaces/IAlgebraPool.sol';
import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IGlobalFactory.sol";
import "./FeeVault.sol";

interface IALMStrategy {
    function pool() external view returns(address);
}

contract GlobalFactory is IGlobalFactory, AccessControl {

    using SafeERC20 for IERC20;

    /// @notice Role to manage fee vaults
    bytes32 public constant FEE_VAULT_MANAGER_ROLE = keccak256("FEE_VAULT_MANAGER_ROLE");

    /// @notice Role to manage GlobalFactory
    bytes32 public constant GLOBAL_FACTORY_MANAGER_ROLE = keccak256("GLOBAL_FACTORY_MANAGER_ROLE");

    /// @notice Zero Address
    address constant public ADDR_0 = address(0);

    /// @notice Emission token contract
    address public immutable emissionToken;

    /// @notice Treasury address or contract
    address public treasury;

    /// @notice Claimer contract for multiple claims
    address public claimer;

    /// @notice EpochDistributor contract
    address public distribution;

    /// @notice IncentiveMaker contract
    address public incentiveMaker;

    /// @notice List of tokens allowed to be voted
    address[] public tokens;

    /// @notice Default reward tokens for gauges
    address[] public defaultGaugeRewardTokens;

    /// @notice Factory contracts
    IGaugeFactory public gaugeFactory;
    IVotingIncentivesFactory public votingIncentivesFactory;
    IPairFactory public pairFactorySld;
    IAlgebraFactory public algebraFactory;
    IWeightedPoolsSimple public weightedFactory;


    /// @notice Voter contract
    IVoter public voter;

    /// @notice Mapping of tokens allowed to be voted
    mapping(address => bool) public isToken;

    /// @notice Mapping of pool types
    /// @dev type:= {0: solidly pairs, 1: ALMs, 2: Manual CL, 3: Weighted Pools}
    mapping(uint8 => bool) public poolType;

    /// @notice Mapping of who can create type N pools (type 0 is permissionless)
    mapping(uint8 => mapping(address => bool)) internal canCreatePoolType;

    /// @notice Constructor for GlobalFactory
    /// @param _voter Voter contract
    /// @param _emissionToken Emission token contract
    /// @param _distribution EpochDistributor contract
    /// @param _pfsld Solidly Pair Factory contract
    /// @param _pfalgb Algebra Pair Factory contract
    /// @param _gf Gauge Factory contract
    /// @param _vif Voting Incentives Factory contract
    /// @param _treasury Treasury address or contract
    /// @param _claimer Claimer contract
    /// @param _incentiveMaker Eternal Farming contract
    constructor(address _voter, address _emissionToken, address _distribution, address _pfsld, address _pfalgb, address _gf, address _vif, address _treasury, address _claimer, address _incentiveMaker) {

        if(_voter == ADDR_0) revert AddressZero();
        if(_distribution == ADDR_0) revert AddressZero();
        if(_pfsld == ADDR_0) revert AddressZero();
        if(_pfalgb == ADDR_0) revert AddressZero();
        if(_gf == ADDR_0) revert AddressZero();
        if(_vif == ADDR_0) revert AddressZero();
        if(_treasury == ADDR_0) revert AddressZero();
        if(_claimer == ADDR_0) revert AddressZero();
        if(_emissionToken == ADDR_0) revert AddressZero();
        if(_incentiveMaker == ADDR_0) revert AddressZero();

        voter = IVoter(_voter);

        emissionToken = _emissionToken;
        defaultGaugeRewardTokens.push(_emissionToken);

        claimer = _claimer;
        distribution = _distribution;
        gaugeFactory = IGaugeFactory(_gf);
        pairFactorySld = IPairFactory(_pfsld);
        algebraFactory = IAlgebraFactory(_pfalgb);
        votingIncentivesFactory = IVotingIncentivesFactory(_vif);
        incentiveMaker = _incentiveMaker;
        treasury = _treasury;

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(GLOBAL_FACTORY_MANAGER_ROLE, msg.sender);
        _grantRole(FEE_VAULT_MANAGER_ROLE, msg.sender);

    }

    /// @notice Create gauge, feeVault and votingIncentives for a given pool
    /// @param _pool The ERC20 pool contract
    /// @param pool_type The type of the pool (ref.: poolType)
    /// @return feeVault The address of the created fee vault
    /// @return gauge The address of the created gauge
    /// @return votingIncentives The address of the created voting incentives
    function create(address _pool, uint8 pool_type) external returns (address feeVault, address gauge, address votingIncentives){
        address[] memory _tokens = _beforeCreate(_pool, pool_type);
        (feeVault, gauge, votingIncentives) = _deploy(_tokens, _pool, pool_type);
        emit Create(feeVault, gauge, votingIncentives, _pool);
    }

    /// @dev verify pool and pool_tokens are valid
    function _beforeCreate(address _pool, uint8 pool_type) internal view returns(address[] memory _tokens) {

        if(_pool == ADDR_0) revert AddressZero();
        if(!poolType[pool_type]) revert PoolType();
        if(voter.isPool(_pool)) revert PoolExists();
        if(_pool.code.length == 0) revert PoolIsNotAContract();

        if(pool_type == 3) {
            if(!weightedFactory.isPoolFromFactory(_pool)) revert NotValidPool();
            bytes32 _poolId = IWeightedPoolsSimple(_pool).getPoolId();
            (IERC20[] memory _ierc20tokens,,) = IWeightedPoolsSimple(IWeightedPoolsSimple(_pool).getVault()).getPoolTokens(_poolId);
            _tokens = new address[](_ierc20tokens.length);
            for (uint i = 0; i < _tokens.length; i++) {
                if(!isToken[address(_ierc20tokens[i])]) revert TokenNotAllowed();
                _tokens[i] = address(_ierc20tokens[i]);
            }
        } else {
            _tokens = new address[](2);
            _tokens[0] = IPairInfo(_pool).token0();
            _tokens[1] = IPairInfo(_pool).token1();

            if(!isToken[_tokens[0]] || !isToken[_tokens[1]]) revert TokenNotAllowed();

            if(pool_type == 0){
                if(!pairFactorySld.isPair(_pool)) revert NotValidPool();
            } else {
                if(!canCreatePoolType[pool_type][msg.sender]) revert NotAllowed();
                // only address(0) deployer pools are allowed to create a gauge
                address _pool_factory = algebraFactory.poolByPair(_tokens[0], _tokens[1]);
                if (pool_type == 1) {
                    if(IALMStrategy(_pool).pool() != _pool_factory) revert NotValidPool();
                }
                else if(pool_type == 2) {
                    if(pairFactorySld.isPair(_pool) || _pool_factory == ADDR_0) revert NotValidPool();
                }
                else {
                    revert PoolType();
                }
            }
        }
    }

    /// @dev deploy the gauge, fee vault and votingincentives. Finish the settings and add data to the voter
    function _deploy(address[] memory _tokens,address _pool, uint8 pool_type) internal returns(address feeVault, address gauge, address votingIncentives) {
        // Step 1: Get Fee Vault
        if(pool_type == 0) feeVault = _pool;
        else if(pool_type == 1) feeVault = address( new FeeVault(_pool, ADDR_0, treasury) );
        else if(pool_type == 3) feeVault = IWeightedPoolsSimple(_pool).feesContract();
        else {
            feeVault =  IAlgebraPool(_pool).communityVault();
            if(feeVault == ADDR_0) revert AddressZero();
        }

        // Step 2: Create the Gauge contract
        if(pool_type < 2) gauge = gaugeFactory.createGauge(defaultGaugeRewardTokens,_pool,distribution, feeVault,ADDR_0, claimer, false);
        else if(pool_type == 2) gauge = gaugeFactory.createEternalGauge(_pool, distribution, feeVault, ADDR_0, incentiveMaker);
        else {
            gauge = gaugeFactory.createGauge(defaultGaugeRewardTokens,_pool,distribution, feeVault,ADDR_0, claimer, true);
        }

        // Step 3: Create the Voting Incentives contract
        votingIncentives = votingIncentivesFactory.createVotingIncentives(ADDR_0, ADDR_0, address(voter), gauge, claimer);

        // Step 4: Finish setup
        if(pool_type == 1) IFeeVault(feeVault).setGauge(gauge);
        IGaugeFactory(address(gaugeFactory)).setVotingIncentives(gauge, votingIncentives);
        votingIncentivesFactory.addRewardsToVotingIncentives(_tokens, votingIncentives);

        // Step 5: Add to Voter
        voter.addPoolData(_pool, gauge, votingIncentives);
    }




    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ONLY OWNER
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */
    /// @notice Whitelist tokens for gauges creation
    /// @param _tokens List of tokens to be allowed
    function addToken(address[] calldata _tokens) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        uint i;
        address _token;
        for(i; i < _tokens.length; i++){
            _token = _tokens[i];
            if(!isToken[_token]){
                tokens.push(_token);
                isToken[_token] = true;
                emit AddToken(_token);
            }
        }
    }

    /// @notice Ban tokens for gauges creation
    /// @param _tokens List of tokens to remove
    function removeToken(address[] calldata _tokens) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        uint i;
        address _token;
        for(i; i < _tokens.length; i++){
            _token = _tokens[i];
            if(isToken[_token]){
                _findTokenAndPop(_token);
                isToken[_token] = false;
                emit RemoveToken(_token);
            }
        }
    }

    /// @notice Internal helper to find token from list and remove it
    /// @param _token Token to find and remove
    function _findTokenAndPop(address _token) private {
        uint i;
        for(i; i < tokens.length; i++){
            if(tokens[i] == _token){
                tokens[i] = tokens[tokens.length - 1];
                tokens.pop();
                break;
            }
        }
    }

    /// @notice Set an EOA/Contract that can create Type 1 pools
    /// @dev Type 0 are permissionless, Type 1/2 require more security that can't be done via contract
    /// @param _type Pool type
    /// @param status True to allow, false to disallow
    /// @param user Address to set permission for
    function setPoolTypeCreator(uint8 _type, bool status, address user) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        canCreatePoolType[_type][user] = status;
        emit SetPoolTypeCreator(_type, status, user);
    }

    /// @notice Set a Pool Type for gauge creation
    /// @param _type Type of the pool
    /// @param status True to allow, false to disallow
    /// @dev type:= {0: solidly pairs, 1: ALMs, 2: Manual CL, 3: Weighted Pools}
    function setPoolType(uint8 _type, bool status) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        poolType[_type] = status;
        emit SetPoolType(_type, status);
    }

    /// @notice Set the Voter contract
    /// @param _voter Address of the new Voter contract
    function setVoter(address _voter) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_voter == ADDR_0) revert AddressZero();
        voter = IVoter(_voter);
        emit SetVoter(_voter);
    }

    /// @notice Set the pair factory for solidly pairs (vAMM and sAMM)
    /// @param _fact Address of the new Solidly pair factory
    function setPairFactorySolidly(address _fact) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_fact == ADDR_0) revert AddressZero();
        pairFactorySld = IPairFactory(_fact);
        emit SetPairFactorySolidly(_fact);
    }

    /// @notice Set the pair factory for Algebra pairs (Conc. liquidity)
    /// @param _fact Address of the new Algebra pair factory
    function setPairFactoryAlgebra(address _fact) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_fact == ADDR_0) revert AddressZero();
        algebraFactory = IAlgebraFactory(_fact);
        emit SetPairFactoryAlgebra(_fact);
    }

    /// @notice Set the Gauge factory
    /// @param _fact Address of the new Gauge factory
    function setGaugeFactory(address _fact) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_fact == ADDR_0) revert AddressZero();
        gaugeFactory = IGaugeFactory(_fact);
        emit SetGaugeFactory(_fact);
    }

    /// @notice Set the pair factory for solidly pairs (vAMM and sAMM)
    /// @param _fact Address of the new Solidly pair factory
    function setWeightedFactory(address _fact) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_fact == ADDR_0) revert AddressZero();
        weightedFactory = IWeightedPoolsSimple(_fact);
        emit SetWeightedFactory(_fact);
    }

    /// @notice Set the Voting Incentives factory
    /// @param _fact Address of the new Voting Incentives factory
    function setVotingIncentivesFactory(address _fact) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_fact == ADDR_0) revert AddressZero();
        votingIncentivesFactory = IVotingIncentivesFactory(_fact);
        emit SetVotingIncentivesFactory(_fact);
    }

    /// @notice Set the treasury address
    /// @dev This contract receives a share of the trading fees
    /// @param _treasury Address of the new treasury contract
    function setTreasury(address _treasury) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_treasury == ADDR_0) revert AddressZero();
        treasury = _treasury;
        emit SetTreasury(_treasury);
    }

    /// @notice Set the distribution contract (epochDistributor contract)
    /// @param distro Address of the new distribution contract
    function setDistribution(address distro) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(distro == ADDR_0) revert AddressZero();
        distribution = distro;
        emit SetDistribution(distro);
    }

    /// @notice Set the Claimer contract
    /// @param claim Address of the new Claimer contract
    function setClaimer(address claim) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(claim == ADDR_0) revert AddressZero();
        claimer = claim;
        emit SetClaimer(claim);
    }


    /// @notice Set the incentivemaker contract
    /// @param _incentivemaker Address of the new incentivemaker contract
    function setIncentiveMaker(address _incentivemaker) external onlyRole(GLOBAL_FACTORY_MANAGER_ROLE) {
        if(_incentivemaker == ADDR_0) revert AddressZero();
        incentiveMaker = _incentivemaker;
        emit SetIncentiveMaker(_incentivemaker);
    }



    /* -----------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
                                    ONLY OWNER - FeeVault
    --------------------------------------------------------------------------------
    --------------------------------------------------------------------------------
    ----------------------------------------------------------------------------- */

    /// @notice Set a new treasury address for a given feevault
    /// @param feevault Address of the fee vault contract
    /// @param _treasury Address of the new treasury
    function setTreasury_feeVault(address feevault, address _treasury) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        IFeeVault(feevault).setTreasury(_treasury);
    }

    /// @notice Set a new share for treasury
    /// @param feevault Address of the fee vault contract
    /// @param share The new share for treasury
    function setTreasuryShare_feeVault(address feevault, uint256 share) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        IFeeVault(feevault).setTreasuryShare(share);
    }

    /// @notice Set a new gauge for the fee vault contract
    /// @param feevault Address of the fee vault contract
    /// @param _gauge Address of the new gauge contract
    function setGauge_feeVault(address feevault,address _gauge) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        IFeeVault(feevault).setGauge(_gauge);
    }

    /// @notice Set who's allowed to call claim fees
    /// @param feevault Address of the fee vault contract
    /// @param caller Address of who's going to call the function
    /// @param status The status of the caller: true = active, false = inactive
    function allow_feeVault(address feevault,address caller, bool status) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        IFeeVault(feevault).allow(caller, status);
    }

    /// @notice Set the new underlying pool for the fee vault
    /// @param feevault Address of the fee vault contract
    /// @param _pool Address of the new pool contract
    function setPool_feeVault(address feevault,address _pool) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        IFeeVault(feevault).setPool(_pool);
    }

    /// @notice Recover tokens from the fee vault contract
    /// @dev Sends tokens to msg.sender
    /// @param feevault Address of the fee vault contract
    /// @param _tokenAddress Address of the token to recover
    /// @param _tokenAmount Amount of the token to recover
    function recoverERC20_feeVault(address feevault, address _tokenAddress, uint256 _tokenAmount) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        IFeeVault(feevault).recoverERC20(_tokenAddress, _tokenAmount);
        IERC20(_tokenAddress).safeTransfer(msg.sender, _tokenAmount);
    }


}
