// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@cryptoalgebra/integral-core/contracts/libraries/TickMath.sol";
import "@cryptoalgebra/integral-farming/contracts/libraries/IncentiveId.sol";

import "./TestAlgebraFactory.sol";

// Mock AlgebraEternalFarming contract to interact with our IncentiveMaker.
// We reproduce the same permission rules and token transfers so they are tested while simulating the ve(3,3) protocol.
// We mock the behavior of creating and running farming incentive campaigns as we rely on Algebra for the correct implementation of these.
contract TestAlgebraEternalFarming {
    using SafeERC20 for IERC20;

    bytes32 public constant INCENTIVE_MAKER_ROLE = keccak256('INCENTIVE_MAKER_ROLE');

    error invalidTokenAmount();
    error reentrancyLock();
    error incentiveStopped();
    error minimalPositionWidthTooWide();
    error zeroRewardAmount();
    error anotherFarmingIsActive();
    error pluginNotConnected();
    error incentiveNotExist();

    struct Incentive {
        uint128 totalReward;
        uint128 bonusReward;
        address virtualPoolAddress;
        uint24 minimalPositionWidth;
        bool deactivated;
        address pluginAddress;
    }
    struct IncentiveParams {
        uint128 reward; // The amount of reward tokens to be distributed
        uint128 bonusReward; // The amount of bonus reward tokens to be distributed
        uint128 rewardRate; // The rate of reward distribution per second
        uint128 bonusRewardRate; // The rate of bonus reward distribution per second
        uint24 minimalPositionWidth; // The minimal allowed width of position (tickUpper - tickLower)
    }

    event EternalFarmingCreated(
        IERC20 indexed rewardToken,
        IERC20 indexed bonusRewardToken,
        IAlgebraPool indexed pool,
        address virtualPool,
        uint256 nonce,
        uint256 reward,
        uint256 bonusReward,
        uint24 minimalAllowedPositionWidth
    );
    event RewardsRatesChanged(uint128 rewardRate, uint128 bonusRewardRate, bytes32 incentiveId);
    event RewardsAdded(uint256 rewardAmount, uint256 bonusRewardAmount, bytes32 incentiveId);

    TestAlgebraFactory public factory;
    address public constant farmingCenter = address(0x1234); // Can be any address: not directly interacted with by IncentiveMaker (should not be address(0) though)

    mapping(bytes32 incentiveId => Incentive incentive) public incentives;
    uint256 public numOfIncentives;
    bool private unlocked = true;

    // Simulate connection of plugins to virtual pools
    mapping(address plugin => address virtualPool) public pluginToVirtualPool;

    constructor(TestAlgebraFactory _factory) {
        factory = _factory;
    }

    function _checkHasRole(bytes32 role) internal view {
        require(factory.hasRoleOrOwner(role, msg.sender));
    }

    modifier onlyIncentiveMaker() {
        _checkHasRole(INCENTIVE_MAKER_ROLE);
        _;
    }

    function _getExistingIncentiveByKey(IncentiveKey memory key) internal view returns (bytes32 incentiveId, Incentive storage incentive) {
        incentiveId = IncentiveId.compute(key);
        incentive = incentives[incentiveId];
        if (incentive.totalReward == 0) revert incentiveNotExist();
    }

    function createEternalFarming(
        IncentiveKey memory key,
        IncentiveParams memory params,
        address plugin
    ) external onlyIncentiveMaker returns (address virtualPool) {
        address connectedPlugin = key.pool.plugin();
        if (connectedPlugin != plugin || connectedPlugin == address(0)) revert pluginNotConnected();
        if (pluginToVirtualPool[connectedPlugin] != address(0)) revert anotherFarmingIsActive();

        virtualPool = address(new TestEternalVirtualPool(address(this), connectedPlugin));
        _connectVirtualPoolToPlugin(virtualPool, connectedPlugin);

        key.nonce = numOfIncentives++;
        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive storage newIncentive = incentives[incentiveId];

        (params.reward, params.bonusReward) = _receiveRewards(key, params.reward, params.bonusReward, newIncentive);
        if (params.reward == 0) revert zeroRewardAmount();

        unchecked {
        if (int256(uint256(params.minimalPositionWidth)) > (int256(TickMath.MAX_TICK) - int256(TickMath.MIN_TICK)))
            revert minimalPositionWidthTooWide();
        }
        newIncentive.virtualPoolAddress = virtualPool;
        newIncentive.minimalPositionWidth = params.minimalPositionWidth;
        newIncentive.pluginAddress = connectedPlugin;

        emit EternalFarmingCreated(
            IERC20(address(key.rewardToken)),
            IERC20(address(key.bonusRewardToken)),
            key.pool,
            virtualPool,
            key.nonce,
            params.reward,
            params.bonusReward,
            params.minimalPositionWidth
        );

        _addRewards(TestEternalVirtualPool(virtualPool), params.reward, params.bonusReward, incentiveId);
        _setRewardRates(TestEternalVirtualPool(virtualPool), params.rewardRate, params.bonusRewardRate, incentiveId);
    }

    function setRates(IncentiveKey memory key, uint128 rewardRate, uint128 bonusRewardRate) external onlyIncentiveMaker {
        (bytes32 incentiveId, Incentive storage incentive) = _getExistingIncentiveByKey(key);
        TestEternalVirtualPool virtualPool = TestEternalVirtualPool(incentive.virtualPoolAddress);

        if ((rewardRate | bonusRewardRate != 0) && (_isIncentiveDeactivated(incentive))) revert incentiveStopped();

        _setRewardRates(virtualPool, rewardRate, bonusRewardRate, incentiveId);
    }

    function addRewards(IncentiveKey memory key, uint128 rewardAmount, uint128 bonusRewardAmount) external {
        (bytes32 incentiveId, Incentive storage incentive) = _getExistingIncentiveByKey(key);

        if (_isIncentiveDeactivated(incentive)) revert incentiveStopped();

        TestEternalVirtualPool virtualPool = TestEternalVirtualPool(incentive.virtualPoolAddress);

        (rewardAmount, bonusRewardAmount) = _receiveRewards(key, rewardAmount, bonusRewardAmount, incentive);

        if (rewardAmount | bonusRewardAmount > 0) {
            _addRewards(virtualPool, rewardAmount, bonusRewardAmount, incentiveId);
        }
    }

    function _addRewards(TestEternalVirtualPool virtualPool, uint128 amount0, uint128 amount1, bytes32 incentiveId) private {
        virtualPool.addRewards(amount0, amount1);
        emit RewardsAdded(amount0, amount1, incentiveId);
    }

    function _receiveRewards(
        IncentiveKey memory key,
        uint128 reward,
        uint128 bonusReward,
        Incentive storage incentive
    ) internal returns (uint128 receivedReward, uint128 receivedBonusReward) {
        if (!unlocked) revert reentrancyLock();
        unlocked = false; // reentrancy lock
        if (reward > 0) receivedReward = _receiveToken(IERC20(address(key.rewardToken)), reward);
        if (bonusReward > 0) receivedBonusReward = _receiveToken(IERC20(address(key.bonusRewardToken)), bonusReward);
        unlocked = true;

        (uint128 _totalRewardBefore, uint128 _bonusRewardBefore) = (incentive.totalReward, incentive.bonusReward);
        incentive.totalReward = _totalRewardBefore + receivedReward;
        incentive.bonusReward = _bonusRewardBefore + receivedBonusReward;
    }

    function _receiveToken(IERC20 token, uint128 amount) private returns (uint128) {
        uint256 balanceBefore = _getBalanceOf(token);
        token.safeTransferFrom(msg.sender, address(this), amount);
        uint256 balanceAfter = _getBalanceOf(token);
        require(balanceAfter > balanceBefore);
        unchecked {
        uint256 received = balanceAfter - balanceBefore;
        if (received > type(uint128).max) revert invalidTokenAmount();
        return (uint128(received));
        }
    }

    function _getBalanceOf(IERC20 token) internal view returns (uint256) {
        return token.balanceOf(address(this));
    }

    function _setRewardRates(TestEternalVirtualPool virtualPool, uint128 rate0, uint128 rate1, bytes32 incentiveId) private {
        virtualPool.setRates(rate0, rate1);
        emit RewardsRatesChanged(rate0, rate1, incentiveId);
    }

    function _isIncentiveDeactivated(Incentive storage incentive) private view returns (bool) {
        address virtualPoolAddress = incentive.virtualPoolAddress;
        bool _deactivated = incentive.deactivated; // if incentive was deactivated directly
        if (!_deactivated) {
        _deactivated = TestEternalVirtualPool(virtualPoolAddress).deactivated(); // if incentive was deactivated automatically
        }
        return _deactivated;
    }

    function _connectVirtualPoolToPlugin(address newVirtualPool, address plugin) internal {
        require(pluginToVirtualPool[plugin] == address(0), 'Another incentive is connected');
        pluginToVirtualPool[plugin] = newVirtualPool;
    }
}

contract TestEternalVirtualPool {
    address public eternalFarming;
    address public connectedPlugin;
    bool public deactivated;

    uint128 public rate0;
    uint128 public rate1;
    uint128 public amount0;
    uint128 public amount1;

    constructor(address _eternalFarming, address _connectedPlugin) {
        require(msg.sender == _eternalFarming, "Not Eternal Farming");

        eternalFarming = _eternalFarming;
        connectedPlugin = _connectedPlugin;
        deactivated = false;
    }

    function setRates(uint128 _rate0, uint128 _rate1) external {
        require(msg.sender == eternalFarming, "Not Eternal Farming");
        rate0 = _rate0;
        rate1 = _rate1;
    }

    function addRewards(uint128 _amount0, uint128 _amount1) external {
        require(msg.sender == eternalFarming, "Not Eternal Farming");
        amount0 += _amount0;
        amount1 += _amount1;
    }
}
