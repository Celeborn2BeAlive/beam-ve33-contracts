// SPDX-License-Identifier: MIT
pragma solidity ^0.8.7;

import "./interfaces/AutomationCompatibleInterface.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";


interface IVoter {
    function length() external view returns (uint);
    function pools(uint index) external view returns (address);
    function isAlive(address _gauge) external view returns (bool);
    function gauges(address _pool) external view returns (address);
    function distributeFees(address[] memory _gauges) external;    
}


contract DistributeFees is AutomationCompatibleInterface, OwnableUpgradeable {

    // last time automation was called
    uint256 public lastCalledAt;
    // last time automation completed all distribution
    uint256 public lastCompletedAt;
    // track pool length
    uint256 public index;
    // voter interface
    IVoter public voter;
    // max number of gauges for batch (used to limit gas on each call)
    uint256 public maxLoops;

    // remove a gauge from distribution, used in case of gauge with tax token not whitelisted and blocking automation
    mapping(address => bool) public lockGauge;

    constructor() {}

    function initialize(address _voter, uint256 _maxLoops) public initializer {
        __Ownable_init();
        voter = IVoter(_voter);
        maxLoops = _maxLoops;
        lastCompletedAt = 0;
    }

    function _lockGauge(address[] memory gauges) external onlyOwner {
        uint i = 0;
        for(i ; i < gauges.length; i++){
            lockGauge[gauges[i]] = true;
        }
    }

    function _unlockGauge(address[] memory gauges) external onlyOwner {
        uint i = 0;
        for(i ; i < gauges.length; i++){
            lockGauge[gauges[i]] = false;
        }
    }

    function setIndex(uint256 _idx) public onlyOwner {
        index = _idx;
    }

    function setLastCompletedAt(uint256 _lastCompletedAt) public onlyOwner {
        lastCompletedAt = _lastCompletedAt;
    }

    function setMaxLoops(uint256 _maxLoops) public onlyOwner {
        maxLoops = _maxLoops;
    }

    function checkUpkeep(bytes memory /*checkdata*/) public view override returns (bool upkeepNeeded, bytes memory /*performData*/) {
        //upkeepneeded should be true monday, friday at 14 UTC, wednesday at 18UTC
        //If more than 3 days have passed since lastCompletedAt we must update!
        if (block.timestamp - lastCompletedAt >= 1 days) {
            upkeepNeeded = true;
        }
    }

    function performUpkeep(bytes calldata /*performData*/) external override {

        lastCalledAt = block.timestamp;

        if(block.timestamp - lastCompletedAt <= 1 days) {
            revert("!checkUpkeep");
        }


        address[] memory tempGauges = new address[](maxLoops);
        uint256 i = 0;
        for (; i < maxLoops && index < voter.length(); i++) {
            address gauge = address(0x0);
            gauge = voter.gauges(voter.pools(index));

            // check wheter a gauge is alive and != address(0), else sub 1 by i. We need 20 clean gauge for batch
            if(gauge != address(0) && voter.isAlive(gauge) && !lockGauge[gauge]) tempGauges[i] = gauge;
            else i == 0? i = 0 : i--;
            
            index++;
        }

        
        if(i >= maxLoops) {
            voter.distributeFees(tempGauges);
        } else {
            address[] memory gauges = new address[](i);
            for(uint256 j = 0; j < i; j++) {
                gauges[j] = tempGauges[j];
            }
            if(gauges.length > 0)
                voter.distributeFees(gauges);
        }


        if(index >= voter.length()) {
            lastCompletedAt = block.timestamp;
            index = 0;
        }
    }
}