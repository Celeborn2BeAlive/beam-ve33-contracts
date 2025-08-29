// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

interface IMinter {
    /// @notice Flip the epoch: mint new tokens and distribute to EpochDistributor, RebaseDistributor and team according to config
    /// @dev Can be executed once per week, updates active_period()
    function update_period() external returns (uint);

    /// @notice Returns true if the epoch can be flipped (ie. block timestamp >= active_period() + WEEK)
    function check_update_period() external view returns(bool);

    /// @notice Returns the timestamp of the start of the epoch that was flipped last
    /// @dev The epoch should be flipped once per week, ideally first second of thursday
    function active_period() external view returns(uint);

    /// @notice Returns the timestamp of the start of the current epoch according to block timestamp
    /// @dev When block_period() == active_period() then the current block is in the active epoch
    function block_period() external view returns(uint);

    /// @notice Returns true if the epoch has been flipped at the current block, according to schedule
    /// @dev Used to guard against state updates that depends on active_period(): Voter and VotingIncentives updates
    /// @dev is_period_updated() is equivalent to block_period() == active_period(), if not the case then the epoch should be flipped before other updates
    function is_period_updated() external view returns(bool);
}
