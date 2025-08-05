// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import '@cryptoalgebra/integral-core/contracts/interfaces/IAlgebraPool.sol';
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "contracts/interfaces/IVotingIncentives.sol";
import "contracts/interfaces/IFeeVault.sol";
import "./interfaces/IIncentiveMaker.sol";


/// @title GaugeEternalFarming
/// @notice Gauge contract for eternal farming
contract GaugeEternalFarming is ReentrancyGuard, Ownable {

    using SafeERC20 for IERC20;

    /// @notice Duration of a week in seconds
    uint32 internal constant WEEK = 86400 * 7;

    /// @notice Address that distributes the rewards
    address public DISTRIBUTION;
    /// @notice Fee vault contract address
    address public feeVault;

    /// @notice The underlying LP token to deposit
    IAlgebraPool public immutable TOKEN;
    /// @notice Contract that manages farm updates
    IIncentiveMaker public incentiveMaker;
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
        require(msg.sender == DISTRIBUTION, "!distributor");
        _;
    }

    /// @notice Deploy the Gauge contract
    /// @param _pool Address of the pool
    /// @param _distribution Address of the distribution contract
    /// @param _feeVault Address of the fee vault (the plugin)
    /// @param _votingIncentives Address of the voting incentives contract
    /// @param _incentiveMaker Address of the incentiveMaker contract
    constructor(address _pool, address _distribution, address _feeVault, address _votingIncentives, address _incentiveMaker) {
        DISTRIBUTION = _distribution;
        feeVault = _feeVault;
        incentiveMaker = IIncentiveMaker(_incentiveMaker);
        TOKEN = IAlgebraPool(_pool);

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

    /// @notice set distribution address
    /// @param _distribution New distribution address
    function setDistribution(address _distribution) external onlyOwner {
        require(_distribution != address(0), "Addr0");
        DISTRIBUTION = _distribution;
    }

    /// @notice set incentive maker address
    /// @param _incentiveMaker New incentive maker address
    function setIncentiveMaker(address _incentiveMaker) external onlyOwner {
        require(_incentiveMaker != address(0), "Addr0");
        incentiveMaker = IIncentiveMaker(_incentiveMaker);
    }

    /// @notice Receive rewards from distribution
    /// @dev This function is called after the tokens have been transferred to this contract
    /// @param _token Address of the reward token
    /// @param _amount Amount of reward tokens
    /// @dev In this case _token is always $THE. Keep compatibility with IGauge.sol
    function notifyRewardAmount(address _token, uint _amount) external nonReentrant onlyDistribution {
        IERC20(_token).safeIncreaseAllowance(address(incentiveMaker), _amount);
        incentiveMaker.updateIncentive(address(TOKEN), _amount);
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

        address _token0 = TOKEN.token0();
        address _token1 = TOKEN.token1();

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
