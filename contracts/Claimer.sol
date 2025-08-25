// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;



import "./interfaces/IVotingIncentives.sol";
import "./interfaces/IGauge.sol";
import "./interfaces/IVotingEscrow.sol";

import "@openzeppelin/contracts/access/Ownable.sol";


contract Claimer is Ownable {

    IVotingEscrow public ve;
    constructor(address _ve){
        ve = IVotingEscrow(_ve);
    }


    /// @notice Claim LP gauge rewards
    function claimRewards(address[] calldata _gauges) external {
        for (uint i = 0; i < _gauges.length; i++) {
            IGauge(_gauges[i]).getRewardFor(msg.sender);
        }
    }

    /// @notice Claim LP gauge rewards for a tokenId
    function claimRewards(address[] calldata _gauges, uint _tokenId) external {
        require(ve.isApprovedOrOwner(msg.sender, _tokenId));
        address claimFor = ve.ownerOf(_tokenId);
        for (uint i = 0; i < _gauges.length; i++) {
            IGauge(_gauges[i]).getRewardFor(claimFor);
        }
    }


    /// @notice Claim Voting Incentives given a tokenID
    /// @dev since we use tokenId, checks the msg.sender is allowed to do operations
    function claimVotingIncentivesTokenId(address[] calldata _votingIncentives, address[][] calldata _tokens, uint _tokenId) external {
        require(ve.isApprovedOrOwner(msg.sender, _tokenId));
        for (uint i = 0; i < _votingIncentives.length; i++) {
            IVotingIncentives(_votingIncentives[i]).getRewardForOwner(_tokenId, _tokens[i]);
        }
    }

    /// @notice Claim Voting Incentives given msg.sender
    function claimVotingIncentivesAddress(address[] calldata _votingIncentives, address[][] calldata _tokens) external {
        for (uint i = 0; i < _votingIncentives.length; i++) {
            IVotingIncentives(_votingIncentives[i]).getRewardForAddress(msg.sender, _tokens[i]);
        }
    }

    /// @notice Set VotingEscrow contract address
    /// @param _ve VotingEscrow contract address
    function setVe(address _ve) external onlyOwner {
        ve = IVotingEscrow(_ve);
    }



}
