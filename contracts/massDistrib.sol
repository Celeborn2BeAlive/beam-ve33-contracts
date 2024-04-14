// SPDX-License-Identifier: AGPL-3.0
pragma solidity 0.8.13;

interface IVoter {
    function distribute(address[] memory) external;
}

contract massDistrib {

    constructor(){}

    function distributeAll(address[] memory gauges) public {
        address[] memory params = new address[](1);
        for (uint256 x = 0; x < gauges.length; x++) {
            params[0] = gauges[x];
            try IVoter(0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73).distribute(params) {

            } catch {

            }
        } 
    }

}