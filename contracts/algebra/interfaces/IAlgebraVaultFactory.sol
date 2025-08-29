// SPDX-License-Identifier: GPL-2.0-or-later
pragma solidity >=0.5.0;

/// @title The interface for the Algebra Vault Factory
/// @notice This contract can be used for automatic vaults creation
/// @dev Version: Algebra Integral
interface IAlgebraVaultFactory {

  /// @notice Struct to store fee information
  /// @param isActive Whether the fee is active
  /// @param share The fee share percentage with 6 decimals precision
  /// @param receiver The address of the fee receiver
  struct FeeInfo {
    bool isActive;
    uint32 share;
    address receiver;
  }

  /// @notice Returns the current Voter address recorded in the factory
  /// @return The address of the Voter
  function voter() external view returns (address);

  function getVaultForPool(address pool) external view returns (address);
  function getTreasuryFees(uint256 amount) external view returns (uint256 treasuryAmount);
  function getTreasuryReceiver() external view returns (address treasury);
  function createVaultForPool(address pool) external returns (address _vault);
  function withdrawFromVault(address to, address[] calldata vault, address[][] calldata token, uint256[][] calldata amount) external;
  function withdrawFromVaultWithPools(address to, address[] calldata pools, address[][] calldata token, uint256[][] calldata amount) external;
  function setVoter(address _voter) external;
  function setTreasury(address _treasury) external;
  function setTreasuryShare(uint32 _treasuryShare) external;
  function setCommunityFee(address pool, uint16 newCommunityFee) external;


  /// @notice Error thrown when a zero address is provided where a non-zero address is required
  error ZeroAddress();
  /// @notice Error thrown when caller is not the Algebra factory
  error NotAlgebraFactory();
  /// @notice Emitted when a new vault is created for a pool
  event VaultCreated(address indexed pool, address indexed vault);
  /// @notice Emitted when voter address is updated
  event SetVoter(address indexed oldVoter, address indexed newVoter);
  /// @notice Emitted when community fee is updated for a pool
  event SetCommunityFee(address indexed pool, uint16 newFee);
  /// @notice Emitted when tokens are withdrawn from vaults
  event VaultWithdrawal(address indexed to, address[] vaults, address[][] tokens, uint256[][] amounts);
  /// @notice Emitted when a gauge is set to a vault
  event SetGauge(address indexed pool, address indexed vault, address indexed gauge);
  /// @notice Emitted when the treasury address is updated
  event SetTreasury(address indexed oldTreasury, address indexed newTreasury);
  /// @notice Emitted when the treasury share percentage is updated
  event SetTreasuryShare(uint32 indexed oldShare, uint32 indexed newShare);

}
