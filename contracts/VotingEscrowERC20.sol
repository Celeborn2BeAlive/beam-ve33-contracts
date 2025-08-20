// SPDX-License-Identifier: GPL-3.0-or-later
pragma solidity >=0.8.0;

import "./interfaces/IVotingEscrow.sol";

import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @title VotingEscrowERC20 Contract
/// @notice Lock the underlying token of a VotingEscrow contract and allow holders to redeem for max-locked veNFT
/// @notice Main use case: distributing ERC20 incentives, bonding for treasury.
/// @notice Commonly referred as "bveToken"
contract VotingEscrowERC20 is ERC20 {
    using SafeERC20 for IERC20;

    /// @notice VotingEscrow contract to max-lock underlying token as veNFT
    IVotingEscrow public votingEscrow;

    event Mint(address account, uint256 amount, address recipient);
    event ExerciseVe(address account, uint256 amount, address recipient, uint256 lockId);

    constructor(IVotingEscrow _votingEscrow)
        ERC20(
            string(abi.encodePacked("b", _votingEscrow.name())),
            string(abi.encodePacked("b", _votingEscrow.symbol()))
        )
    {
        votingEscrow = _votingEscrow;
    }

    function decimals() public view override returns (uint8) {
        return IERC20Metadata(votingEscrow.token()).decimals();
    }

    /// @notice Mint VotingEscrowERC20 token by locking the liquid token in the contract
    /// @param _amount The amount of tokens to mint
    /// @param _recipient The recipient of the minted tokens
    function mint(uint256 _amount, address _recipient) external {
        IERC20 underlyingToken = IERC20(votingEscrow.token());
        underlyingToken.safeTransferFrom(msg.sender, address(this), _amount);
        _mint(_recipient, _amount);
        emit Mint(msg.sender, _amount, _recipient);
    }

    /// @notice Exercises locked underlying tokens for a max-locked veNFT
    /// @param _amount The amount of tokens to exercise
    /// @param _recipient The recipient of the veNFT
    /// @return lockId The tokenId of the minted veNFT
    function exerciseVe(
        uint256 _amount,
        address _recipient
    ) external returns (uint256 lockId) {
        _burn(msg.sender, _amount);
        IERC20 underlyingToken = IERC20(votingEscrow.token());
        underlyingToken.approve(address(votingEscrow), _amount);
        lockId = votingEscrow.create_lock_for(
            _amount,
            votingEscrow.MAXTIME(),
            _recipient
        );
        emit ExerciseVe(msg.sender, _amount, _recipient, lockId);
    }
}
