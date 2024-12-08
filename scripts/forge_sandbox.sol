// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8;

import "contracts/APIHelper/veNFTAPI.sol";

import "forge-std/Script.sol";
import "forge-std/console.sol";


contract MyScript is Script {
    function run() external {
        console.log(block.number);

        veNFTAPI api = veNFTAPI(0x0BAeB0c1803c55755D92cB5E9354f564DF657355);

        address user = 0x76B5fd0271e21C4D02698c3E8099916535b3fb80;
        address pair = 0x1a34EaBbe928Bf431B679959379b2225d60D9cdA;

        IPairAPI.pairInfo memory pairApi = IPairAPI(api.pairAPI()).getPair(pair, address(0));

        address t0 = pairApi.token0;
        address t1 = pairApi.token1;
        uint256 _feeToken0 = IBribeAPI(pairApi.fee).earned(user, t0);
        uint256 _feeToken1 = IBribeAPI(pairApi.fee).earned(user, t1);


        console.log(_feeToken0);
        console.log(_feeToken1);

        veNFTAPI.RewardUser[] memory rewards = api.singlePairReward(user, pair);

        console.log(rewards.length);
    }
}
