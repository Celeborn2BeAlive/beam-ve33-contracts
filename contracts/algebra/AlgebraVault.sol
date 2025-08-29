// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "contracts/interfaces/IVoter.sol";
import "contracts/interfaces/IPairInfo.sol";
import "./interfaces/IAlgebraVault.sol";
import "./interfaces/IAlgebraVaultFactory.sol";


/// @title Algebra Vault
/// @notice This contract manages fee collection and distribution for Algebra pools
/// @dev Implements access control for fee management and distribution
contract AlgebraVault is IAlgebraVault, AccessControl {
    using SafeERC20 for IERC20;

    /// @inheritdoc IAlgebraVault
    bytes32 public constant FEE_VAULT_MANAGER_ROLE = keccak256("FEE_VAULT_MANAGER_ROLE");

    /// @inheritdoc IAlgebraVault
    address public immutable factory;
    /// @inheritdoc IAlgebraVault
    address public immutable pool;
    /// @notice The first token of the pool pair
    IERC20 private token0;
    /// @notice The second token of the pool pair
    IERC20 private token1;

    /// @notice Constructs the AlgebraVault contract
    /// @param _pool The address of the associated Algebra pool
    constructor(address _pool, address _factory) {
        if(_pool == address(0)) revert ZeroAddress();
        if(_factory == address(0)) revert ZeroAddress();

        pool = _pool;
        token0 = IERC20(IPairInfo(_pool).token0());
        token1 = IERC20(IPairInfo(_pool).token1());

        factory = _factory;

        _grantRole(FEE_VAULT_MANAGER_ROLE, _factory);
    }

    /// @inheritdoc IAlgebraVault
    function withdraw(address to, address[] calldata token, uint256[] calldata amount) external onlyRole(FEE_VAULT_MANAGER_ROLE) {
        for(uint i = 0; i < token.length; i++){
            if( IERC20(token[i]).balanceOf(address(this)) < amount[i]) revert WithdrawAmountTooBig();
            IERC20(token[i]).safeTransfer(to, amount[i]);
        }
    }

    /// @inheritdoc IAlgebraVault
    function claimFees() external returns(uint256 _claimed0, uint256 _claimed1) {

        if(msg.sender != IVoter(IAlgebraVaultFactory(factory).voter()).gaugeForPool(pool)) revert MsgSenderNotGauge();

        _claimed0 = token0.balanceOf(address(this));
        _claimed1 = token1.balanceOf(address(this));

        address treasury = IAlgebraVaultFactory(factory).getTreasuryReceiver();
        uint256 _treasuryAmount;

        // handle token 0 fees
        if(_claimed0 > 0) {
            if (treasury != address(0)) {
                _treasuryAmount = IAlgebraVaultFactory(factory).getTreasuryFees(_claimed0);
            }
            if(_treasuryAmount > 0) {
                token0.safeTransfer(treasury, _treasuryAmount);
            }
            _claimed0 = _claimed0 - _treasuryAmount;
            token0.safeTransfer(msg.sender, _claimed0);
        }
        // handle token 1 fees
        if(_claimed1 > 0) {
            if (treasury != address(0)) {
                _treasuryAmount = IAlgebraVaultFactory(factory).getTreasuryFees(_claimed1);
            }
            if(_treasuryAmount > 0) {
                token1.safeTransfer(treasury, _treasuryAmount);
            }
            _claimed1 = _claimed1 - _treasuryAmount;
            token1.safeTransfer(msg.sender, _claimed1);
        }

        emit FeesDistributed(msg.sender, _claimed0, _claimed1);
    }
}
