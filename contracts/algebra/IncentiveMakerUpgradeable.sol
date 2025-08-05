// SPDX-License-Identifier: MIT
pragma solidity <0.9.0;

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import '@cryptoalgebra/integral-farming/contracts/interfaces/IAlgebraEternalFarming.sol';
import '@cryptoalgebra/integral-farming/contracts/interfaces/IFarmingCenter.sol';
import '@cryptoalgebra/integral-farming/contracts/libraries/IncentiveId.sol';
import '@cryptoalgebra/integral-periphery/contracts/libraries/PoolAddress.sol';
import "contracts/interfaces/IVoter.sol";

/// @title Incentive Maker Contract
/// @notice Manages the creation and updating of farming incentives for Algebra pools
contract IncentiveMakerUpgradeable is AccessControlUpgradeable {

    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @notice Role identifier for the incentive maker manager
    bytes32 public constant INCENTIVE_MAKER_MANAGER_ROLE = keccak256(abi.encode("INCENTIVE_MAKER_MANAGER_ROLE"));

    /// @notice Initialization flag
    bool internal init;

    /// @notice Minimum position width for incentives
    uint24 public constant MINIMAL_POSITION_WIDTH = 1;

    /// @notice Duration of a week in seconds
    uint128 private constant WEEK = 604_800;

    /// @notice Address of the thena token
    address public thena;

    /// @notice Address of the wbnb token
    address public wbnb;

    /// @notice Interface to interact with the voter contract
    IVoter public voter;

    /// @notice Interface to interact with the algebra eternal farming contract
    IAlgebraEternalFarming public algebraEternalFarming;

    /// @notice Interface to interact with the farming center contract
    IFarmingCenter public farmingCenter;

    /// @notice Mapping of pool addresses to their corresponding incentive keys
    mapping(address pool => IncentiveKey key) public poolToKey;

    /// @notice Mapping of pool addresses to their corresponding virtualFarmingPool
    mapping(address pool => address virtualFarmingPool) public poolToVirtualPool;

    /// @notice Mapping of pool addresses to track if incentive exists
    mapping(address pool => bool flag) internal incentiveExists;

    /// @notice Error thrown when attempting to set an incentive that already exists
    error IncentiveExists();

    /// @notice Error thrown when attempting to set a zero address
    error ZeroAddress();

    /// @notice Error thrown when attempting to set an incentive with a zero reward amount
    error RewardAmount();

    /// @notice Error thrown when an unauthorized address attempts to update an incentive
    error NotGauge();

    /// @notice Error thrown when an unauthorized plugin attempts an operation
    error NotPlugin();

    /// @notice Emitted when the eternal farming contract address is updated
    /// @param algebraEternalFarming The address of the new eternal farming contract
    event SetEternalFarming(address algebraEternalFarming);

    /// @notice Contract constructor
    constructor() {}


    /// @dev Grants INCENTIVE_MAKER_MANAGER_ROLE to deployer
    function initialize(address _thena, address _wbnb) initializer  public {
        _grantRole(INCENTIVE_MAKER_MANAGER_ROLE, msg.sender);
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        if(_thena == address(0)) revert ZeroAddress();
        if(_wbnb == address(0)) revert ZeroAddress();
        thena = _thena;
        wbnb = _wbnb;
    }



    /// @notice Initializes the contract with required addresses
    /// @param _algebraEternalFarming The address of the algebra eternal farming contract
    /// @param _voter The address of the voter contract
    /// @dev Can only be called once by INCENTIVE_MAKER_MANAGER_ROLE
    function _initialize(address _algebraEternalFarming, address _voter) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) {

        if(_algebraEternalFarming == address(0)) revert ZeroAddress();
        if(_voter == address(0)) revert ZeroAddress();
        require(!init);

        voter = IVoter(_voter);
        algebraEternalFarming = IAlgebraEternalFarming(_algebraEternalFarming);

        address _farmingCenter = algebraEternalFarming.farmingCenter();
        if(_farmingCenter == address(0)) revert ZeroAddress();
        farmingCenter = IFarmingCenter(_farmingCenter);

        init = true;
    }

    /// @notice Creates an incentive for a Concentrated Liquidity pool
    /// @param pool The CL pool address
    /// @param theamount The $THE amount to distribute over a week
    /// @param wbnbamount The $WBNB amount to distribute over a week
    /// @return The address of the created virtual pool
    /// @dev Pool must exist, wbnbAmount can be 0, thena must be > 0
    function createIncentive(address pool, uint128 theamount, uint128 wbnbamount) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) returns(address) {
        IncentiveKey memory key = _verifyIncentive(pool, theamount);
        IAlgebraEternalFarming.IncentiveParams memory params = _getParams(theamount, wbnbamount);
        return _createAndSaveIncentive(key, params, IAlgebraPool(pool).plugin());
    }

    /// @notice Internal function to create and save an incentive
    /// @param key The incentive key
    /// @param params The incentive parameters
    /// @param plugin The plugin address
    /// @return The address of the created virtual pool
    function _createAndSaveIncentive(IncentiveKey memory key, IAlgebraEternalFarming.IncentiveParams memory params, address plugin) internal returns(address) {
        IERC20Upgradeable(thena).safeTransferFrom(msg.sender, address(this), params.reward);
        IERC20Upgradeable(thena).safeIncreaseAllowance(address(algebraEternalFarming),params.reward);

        if(params.bonusReward > 0){
            IERC20Upgradeable(wbnb).safeTransferFrom(msg.sender, address(this), params.bonusReward);
            IERC20Upgradeable(wbnb).safeIncreaseAllowance(address(algebraEternalFarming),params.bonusReward);
        }

        address _virtualPool = algebraEternalFarming.createEternalFarming(key, params, plugin);
        poolToKey[address(key.pool)] = key;
        poolToVirtualPool[address(key.pool)] = _virtualPool;
        incentiveExists[address(key.pool)] = true;
        return _virtualPool;
    }

    /// @notice Internal function to verify incentive parameters
    /// @param pool The pool address
    /// @param theamount The THE token amount
    /// @return key The verified incentive key
    function _verifyIncentive(address pool, uint128 theamount) internal view returns(IncentiveKey memory key) {
        if(theamount == 0) revert RewardAmount();
        if(pool == address(0)) revert ZeroAddress();

        key = poolToKey[pool];
        if(incentiveExists[pool]) revert IncentiveExists();
        key = IncentiveKey(IERC20Minimal(thena),IERC20Minimal(wbnb),IAlgebraPool(pool), algebraEternalFarming.numOfIncentives());
    }

    /// @notice Internal function to calculate incentive parameters
    /// @param amnt0 The amount of first token
    /// @param amnt1 The amount of second token
    /// @return params The calculated incentive parameters
    function _getParams(uint128 amnt0, uint128 amnt1) internal pure returns(IAlgebraEternalFarming.IncentiveParams memory params) {
        (uint128 rate_0, uint128 rate_1) = (amnt0/WEEK, amnt1/WEEK);
        return IAlgebraEternalFarming.IncentiveParams(amnt0, amnt1, rate_0, rate_1, MINIMAL_POSITION_WIDTH);
    }

    /// @notice Updates the incentive for a given pool
    /// @param pool The address of the pool
    /// @param reward The amount of reward to set
    /// @dev Can only be called by the pool's gauge
    function updateIncentive(address pool, uint256 reward) external {
        if(voter.gaugeForPool(pool) != msg.sender) revert NotGauge();

        IncentiveKey memory key = poolToKey[pool];

        bool isZeroAmount = reward == 0 ? true : false;
        bool _incentiveExists = incentiveExists[pool];
        uint128 rate = 0;
        if(isZeroAmount){
            if(_incentiveExists) algebraEternalFarming.setRates(key, 0, 0);
            return;
        } else {
            // get tokens, prepare allowance and rates
            IERC20Upgradeable(thena).safeTransferFrom(msg.sender, address(this), reward);
            IERC20Upgradeable(thena).safeIncreaseAllowance(address(algebraEternalFarming), reward);
            rate = uint128(reward)/WEEK;
        }

        address plugin = IAlgebraPool(pool).plugin();

        if(!_incentiveExists) {
            IAlgebraEternalFarming.IncentiveParams memory params = IAlgebraEternalFarming.IncentiveParams(uint128(reward), 0, rate, 0, MINIMAL_POSITION_WIDTH);
            key = IncentiveKey(IERC20Minimal(thena),IERC20Minimal(wbnb),IAlgebraPool(pool), algebraEternalFarming.numOfIncentives());
            address _virtualPool = algebraEternalFarming.createEternalFarming(key, params, plugin);
            poolToKey[pool] = key;
            incentiveExists[pool] = true;
            poolToVirtualPool[address(key.pool)] = _virtualPool;
        } else {
            algebraEternalFarming.addRewards(key, uint128(reward), 0);
            algebraEternalFarming.setRates(key, rate, 0);
        }
    }

    /// @notice Updates the extra incentive for a given pool
    /// @param pool The address of the pool
    /// @param reward The amount of extra reward to set
    function updateExtraIncentive(address pool, uint128 reward) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) {
        if(reward == 0) revert RewardAmount();
        if(pool == address(0)) revert ZeroAddress();

        IncentiveKey memory key = poolToKey[pool];
        uint128 rate_reward = reward/WEEK;

        IERC20Upgradeable(wbnb).safeTransferFrom(msg.sender, address(this), reward);
        IERC20Upgradeable(wbnb).safeIncreaseAllowance(address(algebraEternalFarming), reward);

        address plugin = IAlgebraPool(pool).plugin();
        IAlgebraEternalFarming.IncentiveParams memory params = IAlgebraEternalFarming.IncentiveParams(0, reward, 0, rate_reward, MINIMAL_POSITION_WIDTH);

        if(address(key.pool) == address(0)) {
            key = IncentiveKey(IERC20Minimal(thena),IERC20Minimal(wbnb),IAlgebraPool(pool), algebraEternalFarming.numOfIncentives());
            algebraEternalFarming.createEternalFarming(key, params, plugin);
        } else {
            algebraEternalFarming.addRewards(key, 0, reward);
            algebraEternalFarming.setRates(key, 0, rate_reward);
        }
    }

    /// @notice Sets the eternal farming contract address
    /// @param _algebraEternalFarming The address of the new eternal farming contract
    function setAlgebraEnternalFarming(address _algebraEternalFarming) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) {
        if(_algebraEternalFarming == address(0)) revert ZeroAddress();
        algebraEternalFarming = IAlgebraEternalFarming(_algebraEternalFarming);
        emit SetEternalFarming(_algebraEternalFarming);
    }

    /// @notice Sets the farming center address
    /// @param _farmingCenter The address of the new farming center
    function setFarmingCenter(address _farmingCenter) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) {
        if(_farmingCenter == address(0)) revert ZeroAddress();
        farmingCenter = IFarmingCenter(_farmingCenter);
    }

    /// @notice Sets the pool to key mapping
    /// @param key The incentive key to set
    function setPoolToKey(IncentiveKey calldata key) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) {
        if(address(key.pool) == address(0)) revert ZeroAddress();
        poolToKey[address(key.pool)] = key;
    }

    function setIncentiveExists(address pool, bool exists) external onlyRole(INCENTIVE_MAKER_MANAGER_ROLE) {
        incentiveExists[pool] = exists;
    }

    /// @notice Checks if an incentive is active for a given pool
    /// @param pool The address of the pool
    /// @return true if the incentive is active, false otherwise
    function incentiveIsActive(address pool) external view returns(bool) {
        return incentiveExists[pool];
    }

}
