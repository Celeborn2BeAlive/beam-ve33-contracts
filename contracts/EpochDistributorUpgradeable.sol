// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


import "./interfaces/IMinter.sol";
import "./interfaces/IGauge.sol";
import "./interfaces/IVoter.sol";
import "./interfaces/IEpochDistributor.sol";

import "@openzeppelin/contracts-upgradeable/token/ERC20/utils/SafeERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


/// @title Distribute weekly EmissionToken to gauges
/// @author Prometheus - Thena Finance
/// @author Forked and adapted by c2ba - Beam team
contract EpochDistributorUpgradeable is IEpochDistributor, OwnableUpgradeable {

    using SafeERC20Upgradeable for IERC20Upgradeable;

    /// @dev Structure to save epoch distribution info
    struct EpochData {
        uint256 amount;         // total amount to distribute
        uint256 totalWeights;   // total votes
        uint256 timestamp;      // the start of the epoch
        uint256 poolsLength;     // epoch pools (from 0 to poolsLength)
    }

    /// @dev flag to allow update
    bool private updateReady;

    /// @dev PRECISION for distribution math
    uint256 constant public PRECISION = 100_000;
    /// @dev Week timestamp
    uint256 constant public WEEK = 7 days;

    /// @dev Epoch counter
    uint256 public currentEpoch;
    /// @dev The last Pool that was distributed
    uint256 public lastPool;

    /// @dev Minter address
    address public minter;
    /// @dev EmissionToken address
    address public emissionToken;
    /// @dev Voter address
    address public voter;

    /// @dev Map the epoch => amounts to distribute
    mapping(uint256 => EpochData) public amountsPerEpoch;

    /// @dev Map the Automation contract => bool
    mapping(address => bool) public isAutomation;

    /// @dev Map pool => last distribute timestamp
    mapping(address => uint256) public poolToLastimestamp;

    constructor() {}

    /// @notice Initialize this contract
    /// @param _minter Minter address
    /// @param _emissionToken  EmissionToken address
    /// @param _voter  Voter address
    function initialize(address _minter, address _emissionToken, address _voter) external initializer {
        __Ownable_init();
        if(_emissionToken == address(0)) revert AddressZero();
        if(_minter == address(0)) revert AddressZero();
        if(_voter == address(0)) revert AddressZero();
        minter = _minter;
        emissionToken = _emissionToken;
        voter = _voter;
    }


    /// @notice Notify the weekly EmissionToken incentives.
    /// @dev This is called only from the minter
    /// @param amount weekly EmissionToken amount
    function notifyRewardAmount(uint256 amount) external {
        _isMinter();
        IERC20Upgradeable(emissionToken).safeTransferFrom(msg.sender, address(this), amount);
        // active_period is already next epoch, sub 1 week.
        uint256 active_period = IMinter(minter).active_period() - WEEK;

        uint256 _totalWeights = IVoter(voter).totalWeights(active_period);
        uint256 _poolLength = IVoter(voter).poolsLength();

        amountsPerEpoch[currentEpoch] = EpochData({
            amount: amount,
            timestamp: active_period,
            totalWeights: _totalWeights,
            poolsLength: _poolLength
        });

        updateReady = true;
        emit NotifyRewardAmount(amount, active_period, currentEpoch);
    }

    /// @notice distribute to all the gauges
    function distributeAll() external {
        _isAutomation();
        _checkUpdateReady();
        uint256 poolsLength = amountsPerEpoch[currentEpoch].poolsLength;
        address[] memory pools = IVoter(voter).pools();
        uint256 totalAmount = amountsPerEpoch[currentEpoch].amount;
        uint256 totalWeights = amountsPerEpoch[currentEpoch].totalWeights;
        uint timestamp = amountsPerEpoch[currentEpoch].timestamp;
        _distribute(0, poolsLength, poolsLength, pools, totalAmount, totalWeights, timestamp);
    }

    /// @notice Distribute called from the chainlink automation contract
    /// @param len          length of the distribution
    /// @param timestamp    last epoch timestamp
    /// @param poolsLength  total pools length of the epoch
    /// @param amounts      amounts to distribute
    /// @param pools        pools to distribute
    /// @dev we do not use _distribute to keep calldata pools reducing gas costs
    function distribute(uint256 len, uint256 timestamp, uint256 poolsLength, uint256[] calldata amounts, address[] calldata pools) external {
        _isAutomation();
        _checkUpdateReady();
        uint i;
        address gauge;
        for(i; i < len; i++) {
            if(poolToLastimestamp[pools[i]] < timestamp) {
                if(amounts[i] > 0) {
                    gauge = IVoter(voter).gaugeForPool(pools[i]);
                    IERC20Upgradeable(emissionToken).safeTransfer(gauge, amounts[i]);
                    IGauge(gauge).notifyRewardAmount(emissionToken, amounts[i]);
                }
                poolToLastimestamp[pools[i]] = timestamp;
            }
        }

        lastPool += len;
        if(lastPool >= poolsLength) {
            updateReady = false;
            lastPool = 0;
            currentEpoch += 1;
        }

    }

    /// @notice Distribute to a given set of gauges
    /// @param from     from where to distribute
    /// @param to       to where to distribute
    /// @param poolsLength  pools length of the epoch
    /// @param pools        pools to distribute
    /// @param totalAmount  total THE for all gauges
    /// @param totalWeights total weights of all gauges
    /// @param timestamp    last epoch timestamp
    function _distribute(uint256 from, uint256 to, uint256 poolsLength, address[] memory pools, uint256 totalAmount, uint256 totalWeights, uint256 timestamp) internal {
        uint i;
        uint len = to - from;
        uint gaugeAmount;
        address gauge;
        address pool;

        for(i; i < len; i++){
            pool = pools[i];
            if(poolToLastimestamp[pool] < timestamp && IVoter(voter).isPool(pool)){
                gaugeAmount = totalAmount * IVoter(voter).poolTotalWeights(pool, timestamp) / totalWeights;
                if(gaugeAmount > 0){
                    gauge = IVoter(voter).gaugeForPool(pool);
                    IERC20Upgradeable(emissionToken).safeTransfer(gauge, gaugeAmount);
                    IGauge(gauge).notifyRewardAmount(emissionToken, gaugeAmount);
                }
                poolToLastimestamp[pool] = timestamp;
            }
        }

        lastPool += len;
        if(lastPool >= poolsLength){
            updateReady = false;
            lastPool = 0;
            currentEpoch += 1;
        }
    }


    /// @notice Set address allowed to run automation
    /// @param automation the automation contract that calls distribute
    /// @param status   true = exists, false = does not exists
    function setAutomation(address automation, bool status) external onlyOwner {
        if(automation == address(0)) revert AddressZero();
        isAutomation[automation] = status;
        emit SetAutomation(automation, status);
    }

    /// @notice Set the minter address
    /// @param _minter new minter
    function setMinter(address _minter) external onlyOwner {
        if(_minter == address(0)) revert AddressZero();
        minter = _minter;
        emit SetMinter(_minter);
    }

    /// @notice Set the voter address
    /// @param _voter new voter
    function setVoter(address _voter) external onlyOwner {
        if(_voter == address(0)) revert AddressZero();
        voter = _voter;
        emit SetVoter(_voter);
    }


    /// @notice Check if is ready to be distributed
    function checkUpKeep() external view returns(bool) {
        return updateReady;
    }

    /// @notice Check if update is ready
    function _checkUpdateReady() internal view {
        if(!updateReady) revert UpdateNotReady();
    }

    /// @notice Check if caller is the automation
    function _isAutomation() internal view {
        if(!isAutomation[msg.sender]) revert NotAutomation();
    }

    /// @notice Check if caller is the minter
    function _isMinter() internal view {
        if(msg.sender != minter) revert NotMinter();
    }

    /// @notice Recover some ERC20 from the contract.
    /// @param tokenAddress the address of the token to withdraw
    /// @param tokenAmount  the amount to withdraw
    function emergencyRecoverERC20(address tokenAddress, uint256 tokenAmount) external onlyOwner {
        require(tokenAmount <= IERC20Upgradeable(tokenAddress).balanceOf(address(this)));
        IERC20Upgradeable(tokenAddress).safeTransfer(msg.sender, tokenAmount);
        emit EmergencyRecoverERC20(tokenAddress, msg.sender, tokenAmount);
    }


    /// @dev Revert if is not the minter contract
    error NotMinter();
    /// @dev Revert if is not the automation contract
    error NotAutomation();
    /// @dev Revert if is not ready for update
    error UpdateNotReady();
    /// @dev Revert if address is zero
    error AddressZero();

    // Events
    event NotifyRewardAmount(uint256 indexed amount, uint256 epochtimestamp, uint256 indexed epoch);
    event SetAutomation(address indexed automation, bool status);
    event SetMinter(address indexed minter);
    event SetVoter(address indexed voter);
    event EmergencyRecoverERC20(address indexed tokenAddress, address indexed receiver, uint256 tokenAmount);

    /// @notice fallback function to receive gas token
    receive() external payable {}

}
