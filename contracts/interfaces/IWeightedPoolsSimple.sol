// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/// @title Interface for Balancer Weighted Pool functionality
/// @notice Defines core functions for interacting with Balancer Weighted Pools
interface IWeightedPoolsSimple {

    // ======================================
    // ========== VAULT FUNCTIONS ===========
    // ======================================
    /**
     * @notice Returns the tokens, balances and last change block for a given pool
     * @param poolId The ID of the pool to query
     * @return tokens Array of token addresses in the pool
     * @return balances Array of token balances in the pool
     * @return lastChangeBlock Block number when balances were last modified
     */
    function getPoolTokens(bytes32 poolId)
        external
        view
        returns (
            IERC20[] memory tokens,
            uint256[] memory balances,
            uint256 lastChangeBlock
        );

    // ======================================
    // ========== POOL FUNCTIONS ===========
    // ======================================
    /**
     * @notice Returns the Balancer Vault contract address that manages this pool
     * @return Address of the Balancer Vault
     */
    function getVault() external view returns (address);

    /**
     * @notice Returns the unique identifier for this pool
     * @dev This ID is used for all interactions with the Vault (joins, exits, swaps)
     * @return Pool's unique identifier
     */
    function getPoolId() external view returns (bytes32);

    // ======================================
    // ========= FACTORY FUNCTIONS ==========
    // ======================================
    /**
     * @notice Checks if a pool was created by this factory
     * @param pool Address of the pool to check
     * @return True if pool was created by this factory, false otherwise
     */
    function isPoolFromFactory(address pool) external view returns (bool);

    // ======================================
    // =========== FEE FUNCTIONS ===========
    // ======================================
    /**
     * @notice Returns the fees contract associated with this pool
     * @return feesContract Address of the fees contract
     */
    function feesContract() external view returns (address feesContract);

    /**
     * @notice Calculates claimable fee amounts for a recipient
     * @param recipient Address to check claimable fees for
     * @return claimableAmounts Array of claimable amounts for each pool token
     */
    function expectedFees(address recipient) external view returns(uint256[] memory claimableAmounts);

    /**
     * @notice Returns the total number of tokens in the pool
     * @return Number of tokens in the pool
     */
    function totalTokens() external view returns(uint256);

    /**
     * @notice Returns the token address at a given position in the pool
     * @param position Index position of the token
     * @return Address of the token at the specified position
     */
    function tokens(uint256 position) external view returns(address);
}
