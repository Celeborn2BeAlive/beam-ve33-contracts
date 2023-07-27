// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import {IERC20} from "./interfaces/IERC20.sol";
import {IVotingEscrow} from "./interfaces/IVotingEscrow.sol";

contract VeAirdrop {
  IVotingEscrow public immutable votingEscrow;
  IERC20 public immutable underlyingToken;

  constructor(IVotingEscrow _votingEscrow, IERC20 _underlyingToken) {
    votingEscrow = _votingEscrow;
    underlyingToken = _underlyingToken;

    underlyingToken.approve(address(votingEscrow), type(uint256).max);

    // Sanity check
    require(votingEscrow.token() == address(underlyingToken), "VeAirdrop: voting escrow token mismatch");
  }

  function airdrop(address[] memory recipients, uint256[] memory values, uint256 lockDuration) public returns (bool) {
    require(recipients.length == values.length, "VeAirdrop: recipients and values length mismatch");
    for (uint256 i = 0; i < recipients.length; i++) {
      underlyingToken.transferFrom(msg.sender, address(this), values[i]);
      votingEscrow.create_lock_for(values[i], lockDuration, recipients[i]);
    }
    return true;
  }
}
