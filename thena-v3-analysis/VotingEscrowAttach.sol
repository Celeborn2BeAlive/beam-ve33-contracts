// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

import "../interfaces/VotingEscrow/IVotingEscrow.sol";
import "../interfaces/VotingEscrow/IVotingEscrowAttach.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract VotingEscrowAttach is Ownable, IVotingEscrowAttach {


    mapping(address => bool) public isAllowed;

    IVotingEscrow public ve;

    constructor(address _ve) {
        require(_ve != address(0), 'VotingEscrowAttach: Address(0)');
        ve = IVotingEscrow(_ve);
    }

    /// @inheritdoc IVotingEscrowAttach
    function voting(uint _tokenId) external {
        _isAllowedToAttach();
        ve.voting(_tokenId);
        emit Voting(_tokenId);
    }

    /// @inheritdoc IVotingEscrowAttach
    function abstain(uint _tokenId) external {
        _isAllowedToAttach();
        ve.abstain(_tokenId);
        emit Abstain(_tokenId);
    }

    /// @inheritdoc IVotingEscrowAttach
    function attach(uint _tokenId) external {
        _isAllowedToAttach();
        ve.attach(_tokenId);
        emit Attach(_tokenId);
    }

    /// @inheritdoc IVotingEscrowAttach
    function detach(uint _tokenId) external {
        _isAllowedToAttach();
        ve.detach(_tokenId);
        emit Detach(_tokenId);
    }


    /// @notice check if the caller can (un)lock the veTHE
    /// @dev make sure to check veThe::isApprovedOrOwner(id) on msg.sender contract.
    function _isAllowedToAttach() internal view {
        if(!isAllowed[msg.sender]) revert notAllowedAttach();
    }


    /// @notice Set an address to allow (un)locking
    function setAllow(address _caller, bool status) external onlyOwner {
        isAllowed[_caller] = status;
    }


}
