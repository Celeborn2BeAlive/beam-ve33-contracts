// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

library GaugeMath {

    /// @notice find min amount between two inputs
    function _min(uint a, uint b) internal pure returns (uint) {
        return a < b ? a : b;
    }

}
