// SPDX-License-Identifier: UNLICENSED
pragma solidity >=0.8.0;

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

// Basic IncentiveMaker mock used in tests that don't need to test deep integration with
// Algebra Eternal Farming.
// We prefer testing with the real IncentiveMaker contract and mocking Algebra Eternal Farming with
// TestAlgebraEternalFarming contract.
contract TestIncentiveMaker {
    using SafeERC20 for IERC20;
    IERC20 public token;
    mapping(address pool => uint256 amount) public poolAmount;

    constructor(IERC20 _token) {
        token = _token;
    }

    function updateIncentive(address pool, uint256 amount) external {
        token.safeTransferFrom(msg.sender, address(this), amount);
        poolAmount[pool] += amount;
    }

    function resetIncentive(address pool) external {
        poolAmount[pool] = 0;
    }

    function recoverTokens() external {
        token.safeTransfer(msg.sender, token.balanceOf(address(this)));
    }
}
