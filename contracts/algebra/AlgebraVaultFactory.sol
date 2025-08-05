// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;


import "@openzeppelin/contracts/access/AccessControl.sol";
import '@cryptoalgebra/integral-core/contracts/interfaces/IAlgebraPool.sol';

import "./AlgebraVault.sol";
import "./interfaces/IAlgebraVaultFactory.sol";
/// @title Algebra vault factory
/// @notice This contract is used to deploy and manage AlgebraVault contracts for Algebra pools
contract AlgebraVaultFactory is IAlgebraVaultFactory, AccessControl {



  /// @notice Role identifier for fee vault managers
  bytes32 public constant FEE_VAULT_MANAGER_ROLE = keccak256("FEE_VAULT_MANAGER_ROLE");
  /// @notice Role identifier for factory vault managers
  bytes32 public constant FACTORY_VAULT_MANAGER_ROLE = keccak256("FACTORY_VAULT_MANAGER_ROLE");

  /// @notice Decimal precision used for fee calculations
  uint32 public constant PRECISION = 1e6;

  /// @notice TheNFT fee information
  FeeInfo public feeInfoTheNFT;
  /// @notice Thena Treasury fee information
  FeeInfo public feeInfoThenaTreasury;

  /// @notice The address of the voter contract
  address public voter;

  /// @notice The address of the Algebra factory contract
  address public algebraFactory;

  /// @notice Mapping of pool addresses to their corresponding vault addresses
  mapping(address => address) public poolToVault;


  /// @notice Constructs the AlgebraVaultFactory contract
  /// @param _voter The address of the voter contract
  /// @param _algebraFactory The address of the Algebra factory contract
  constructor(address _voter, address _algebraFactory) {
    if(_voter == address(0)) revert ZeroAddress();
    if(_algebraFactory == address(0)) revert ZeroAddress();
    voter = _voter;
    algebraFactory = _algebraFactory;

    feeInfoTheNFT = FeeInfo({
      isActive: true,
      share: 1e5,
      receiver: 0x6C1C0Af31E3c59bC3DE10c5CDb0d4AF6a0F2EcCC
    });

    feeInfoThenaTreasury = FeeInfo({
      isActive: false,
      share: 1e5,
      receiver: 0x46F99291Eedf25fd5c6AE56BbfD6679d0eA3630B
    });

    _grantRole(FEE_VAULT_MANAGER_ROLE, msg.sender);
    _grantRole(FACTORY_VAULT_MANAGER_ROLE, msg.sender);
  }




  /***************************/
  /********** VIEWS **********/
  /***************************/

  /// @notice Gets the vault address for a given pool
  /// @param pool The address of the pool
  /// @return The address of the corresponding vault
  function getVaultForPool(address pool) external view returns (address) {
    return poolToVault[pool];
  }

  /// @notice Gets the fees for a given amount
  /// @param amount The amount to get fees for
  /// @return thenftAmount The amount of theNFT fees
  /// @return thenatreasuryAmount The amount of thena treasury fees
  function getFees(uint256 amount) external view returns (uint256 thenftAmount, uint256 thenatreasuryAmount) {
    if(feeInfoTheNFT.isActive) thenftAmount = amount * feeInfoTheNFT.share / PRECISION;
    if(feeInfoThenaTreasury.isActive) thenatreasuryAmount = amount * feeInfoThenaTreasury.share / PRECISION;
  }

  /// @notice Gets the receivers of the fees
  /// @return thenft The address of the theNFT receiver
  /// @return thenatreasury The address of the thena treasury receiver
  function getFeesReceivers() external view returns (address thenft, address thenatreasury) {
    return (feeInfoTheNFT.receiver, feeInfoThenaTreasury.receiver);
  }



  /*******************************/
  /********** CREATIONS **********/
  /*******************************/

  /// @notice Creates a new vault for a pool
  /// @param pool The address of the pool to create a vault for
  /// @return _vault The address of the newly created vault
  function createVaultForPool(address pool, address, address, address, address) external returns (address _vault) {
    if(msg.sender != algebraFactory) revert NotAlgebraFactory();
    if(pool == address(0)) revert ZeroAddress();

    _vault = address(new AlgebraVault(pool, voter, address(this)));
    poolToVault[pool] = _vault;
    emit VaultCreated(pool, _vault);
  }



  /*********************************/
  /********** WITHDRAWALS **********/
  /*********************************/


  /// @notice Withdraws tokens from multiple vaults
  /// @param to The address to receive the withdrawn tokens
  /// @param vault An array of vault addresses to withdraw from
  /// @param token A 2D array of token addresses to withdraw for each vault
  /// @param amount A 2D array of amounts to withdraw for each token in each vault
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function withdrawFromVault(address to, address[] calldata vault, address[][] calldata token, uint256[][] calldata amount) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    for(uint i = 0; i < vault.length; i++){
      IAlgebraVault(vault[i]).withdraw(to, token[i], amount[i]);
    }
    emit VaultWithdrawal(to, vault, token, amount);
  }

  /// @notice Withdraws tokens from vaults associated with pools
  /// @param to The address to receive the withdrawn tokens
  /// @param pools An array of pool addresses whose associated vaults to withdraw from
  /// @param token A 2D array of token addresses to withdraw for each pool's vault
  /// @param amount A 2D array of amounts to withdraw for each token in each pool's vault
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function withdrawFromVaultWithPools(address to, address[] calldata pools, address[][] calldata token, uint256[][] calldata amount) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    address[] memory vaults = new address[](pools.length);
    for(uint i = 0; i < pools.length; i++){
      address vault = poolToVault[pools[i]];
      vaults[i] = vault;
      IAlgebraVault(vault).withdraw(to, token[i], amount[i]);
    }
    emit VaultWithdrawal(to, vaults, token, amount);
  }







  /******************************/
  /********** SETTINGS **********/
  /******************************/

  /// @notice Sets a new voter address
  /// @param _voter The new voter address to set
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function setVoter(address _voter) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    if(_voter == address(0)) revert ZeroAddress();
    address oldVoter = voter;
    voter = _voter;
    emit SetVoter(oldVoter, _voter);
  }

  /// @notice Sets the thena treasury address
  /// @param _thenaTreasury The new thena treasury address
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function setThenaTreasury(address _thenaTreasury) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    if(_thenaTreasury == address(0)) revert ZeroAddress();
    address oldReceiver = feeInfoThenaTreasury.receiver;
    feeInfoThenaTreasury.receiver = _thenaTreasury;
    emit SetThenaTreasury(oldReceiver, _thenaTreasury);
  }

  /// @notice Sets the thena share percentage
  /// @param _thenaShare The new thena share percentage
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function setThenaTreasuryShare(uint32 _thenaShare) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    uint32 oldShare = feeInfoThenaTreasury.share;
    feeInfoThenaTreasury.share = _thenaShare;
    emit SetThenaTreasuryShare(oldShare, _thenaShare);
  }


  /// @notice Sets the theNFT fee share percentage
  /// @param share The new share percentage with 6 decimals precision
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function setTheNftShare(uint16 share) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    uint32 oldShare = feeInfoTheNFT.share;
    feeInfoTheNFT.share = share;
    emit SetTheNftShare(oldShare, share);
  }

  /// @notice Sets the theNFT fee receiver address
  /// @param _feeReceiver The new fee receiver address
  /// @dev Only callable by accounts with the FACTORY_VAULT_MANAGER_ROLE
  function setTheNftFeeReceiver(address _feeReceiver) external onlyRole(FACTORY_VAULT_MANAGER_ROLE) {
    if(_feeReceiver == address(0)) revert ZeroAddress();
    address oldReceiver = feeInfoTheNFT.receiver;
    feeInfoTheNFT.receiver = _feeReceiver;
    emit SetTheNftFeeReceiver(oldReceiver, _feeReceiver);
  }


  /// @notice Sets the community fee for a pool
  /// @param pool The address of the pool
  /// @param newCommunityFee The new community fee value
  /// @dev Can be called by the pool's plugin or accounts with FACTORY_VAULT_MANAGER_ROLE
  function setCommunityFee(address pool, uint16 newCommunityFee) external {
    bool access = IAlgebraPool(pool).plugin() == msg.sender ? true : false;
    if(!access) _checkRole(FACTORY_VAULT_MANAGER_ROLE);

    IAlgebraPool(pool).setCommunityFee(newCommunityFee);
    emit SetCommunityFee(pool, newCommunityFee);
  }


}
