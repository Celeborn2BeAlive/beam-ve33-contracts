// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "contracts/interfaces/IVotingIncentives.sol";
import "contracts/interfaces/IPairInfo.sol";
import "contracts/interfaces/IFeeVault.sol";
import "contracts/interfaces/IGaugeFactory.sol";
import "./interfaces/IIncentiveMaker.sol";


/// @title GaugeEternalFarming
/// @notice Gauge contract for eternal farming
contract GaugeEternalFarming is ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;

    /// @notice Duration of a week in seconds
    uint32 internal constant WEEK = 86400 * 7;

    /// @notice Fee vault contract address
    address public feeVault;

    /// @notice The underlying pool
    IPairInfo public immutable pool;
    /// @notice The voting incentives contract
    IVotingIncentives public votingIncentives;


    /// @notice Event emitted when voting incentives are set
    /// @param votingIncentives Address of the new voting incentives contract
    event SetVotingIncentives(address votingIncentives);

    /// @notice Event emitted when fee vault is set
    /// @param feeVault Address of the new fee vault contract
    event SetFeeVault(address feeVault);

    /// @notice Modifier to control if msg.sender is the distribution contract/EOA
    modifier onlyDistribution() {
        require(msg.sender == IGaugeFactory(owner()).epochDistributor(), "!distributor");
        _;
    }

    /// @notice Deploy the Gauge contract
    /// @param _pool Address of the pool
    /// @param _feeVault Address of the fee vault (the plugin)
    /// @param _votingIncentives Address of the voting incentives contract
    constructor(address _pool, address _feeVault, address _votingIncentives) {
        feeVault = _feeVault;
        pool = IPairInfo(_pool);

        if(_votingIncentives != address(0)) votingIncentives = IVotingIncentives(_votingIncentives);
    }

    /// @notice Set the Voting Incentives contract
    /// @param _vi Address of the new voting incentives contract
    function setVotingIncentives(address _vi) external onlyOwner {
        require(_vi != address(0), "zero addr");
        require(_vi != address(votingIncentives), "same addr");
        votingIncentives = IVotingIncentives(_vi);
        emit SetVotingIncentives(_vi);
    }


    /// @notice set feeVault address
    /// @param _feeVault New feeVault address
    function setFeeVault(address _feeVault) external onlyOwner {
        require(_feeVault != address(0), "Addr0");
        feeVault = _feeVault;
        emit SetFeeVault(_feeVault);
    }

    /// @notice Receive rewards from distribution
    /// @dev This function is called after the tokens have been transferred to this contract
    /// @param _token Address of the reward token
    /// @param _amount Amount of reward tokens
    /// @dev In this case _token is always emissionToken. Keep compatibility with IGauge.sol
    function notifyRewardAmount(address _token, uint _amount) external nonReentrant onlyDistribution {
        IIncentiveMaker incentiveMaker = IIncentiveMaker(IGaugeFactory(owner()).incentiveMaker());
        IERC20(_token).safeIncreaseAllowance(address(incentiveMaker), _amount);
        incentiveMaker.updateIncentive(address(pool), _amount);
    }

    /// @notice Claim the fees earned by the underlying strategy or LP
    /// @return claimed0 Amount of token0 claimed
    /// @return claimed1 Amount of token1 claimed
    function claimFees() external nonReentrant returns (uint claimed0, uint claimed1) {
        require(msg.sender == owner());
        return _claimFees();
    }

    /// @notice Internal function to claim fees
    /// @return _claimed0 Amount of token0 claimed
    /// @return _claimed1 Amount of token1 claimed
    function _claimFees() internal returns (uint _claimed0, uint _claimed1) {

        address _token0 = pool.token0();
        address _token1 = pool.token1();

        (_claimed0, _claimed1) = IFeeVault(feeVault).claimFees();


        if (_claimed0 > 0) {
            IERC20(_token0).safeIncreaseAllowance(address(votingIncentives), _claimed0);
            votingIncentives.notifyRewardAmount(_token0, _claimed0);
        }

        if (_claimed1 > 0) {
            IERC20(_token1).safeIncreaseAllowance(address(votingIncentives), _claimed1);
            votingIncentives.notifyRewardAmount(_token1, _claimed1);
        }

    }
}
