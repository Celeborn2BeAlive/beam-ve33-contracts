// SPDX-License-Identifier: Unlicense
pragma solidity ^0.8;

import "contracts/APIHelper/veNFTAPI.sol";
import "contracts/APIHelper/RewardAPI.sol";
import "contracts/interfaces/IMinter.sol";

import "forge-std/Script.sol";
import "forge-std/console.sol";

// To run: forge script --rpc-url $RPC_URL scripts/forge_sandbox.sol

// Vote tx: https://polygonscan.com/tx/0xfd07b44c61e094c77d228f39a8478f0d9e5c83b9335e602b7f22e99179dc2b4a#eventlog

// veNFTAPI: 0x0BAeB0c1803c55755D92cB5E9354f564DF657355
// RewardAPI: 0x7b4c89E8a0882342B826d9D66d0E434181738d72

contract MyScript is Script {
    function run() external {
        console.log(block.number);

        veNFTAPI api = veNFTAPI(0x0BAeB0c1803c55755D92cB5E9354f564DF657355);

        // Speedrun:
        address user = 0x76B5fd0271e21C4D02698c3E8099916535b3fb80;
        // c2ba:
        // address user = 0x49a5492FDFe5AcC966dD5f41310dfDfe8dAA349C;

        // WMATIC/ETH 0.05%
        // address pair = 0x1a34EaBbe928Bf431B679959379b2225d60D9cdA;
        // WBTC/WETH 0.05%
        // address pair = 0xb694E3bdd4BCdF843510983D257679D1E627C474;
        // WMATIC/USDC 0.3%
        // address pair = 0x8c862d100B94d95a49D91958c9e8C2c348d00F04;
        // ETH/USDC.e
        address pair = 0xCE67850420c82dB45eb7fEeCcD2d181300D2BDB3;

        IPairAPI.pairInfo memory pairApi = IPairAPI(api.pairAPI()).getPair(pair, address(0));

        address t0 = pairApi.token0;
        address t1 = pairApi.token1;
        // uint256 _feeToken0 = IBribeAPI2(pairApi.fee).earned(user, t0);
        // uint256 _feeToken1 = IBribeAPI2(pairApi.fee).earned(user, t1);


        // console.log(_feeToken0);
        // console.log(_feeToken1);

        // veNFTAPI.RewardUser[] memory rewards = api.singlePairReward(user, pair);

        // console.log(rewards.length);

        console.log(pairApi.fee);

        IBribeAPI2 bribes = IBribeAPI2(pairApi.fee);
        console.log(pairApi.fee);
        uint256 epochStart = bribes.getEpochStart();
        uint256 nextEpochStart = bribes.getNextEpochStart();

        uint256 timestamp = epochStart - WEEK;
        console.log("timestamp", timestamp);
        console.log("t0", t0);
        console.log("t1", t1);

        console.log("balanceOfOwnerAt ", bribes.balanceOfOwnerAt(user, timestamp));

        console.log("earned int ts", _earned(user, pairApi.fee, t0, timestamp));
        console.log("earned int ts", _earned(user, pairApi.fee, t1, timestamp));
        console.log("earned int ",earned(user, pairApi.fee, t0));
        console.log("earned int ",earned(user, pairApi.fee, t1));

        console.log("rewardPerToken ", bribes.rewardPerToken(t0, timestamp));
        console.log("balanceOfOwnerAt ", bribes.balanceOfOwnerAt(user, timestamp));

        console.log("earned ext ", bribes.earned(user, t0));
        console.log("earned ext ",bribes.earned(user, t1));
    }

    function nextRewards(address user, address pair) internal {
        RewardAPI rewardApi = RewardAPI(0x7b4c89E8a0882342B826d9D66d0E434181738d72);
        address[] memory pairs = new address[](1);
        pairs[0] = pair;
        RewardAPI.Rewards[] memory rewards = rewardApi.getExpectedClaimForNextEpoch(user, pairs);

        console.log("next rewards:");
        for (uint i = 0; i < rewards[0].bribes[1].amounts.length; i++) {
            console.log(rewards[0].bribes[1].amounts[i]);
        }
    }

    uint256 public constant WEEK = 7 days; // rewards are released over 7 days

    function earned(address _owner, address _bribe, address _rewardToken) public view returns(uint256){
        IBribeAPI2 bribes = IBribeAPI2(_bribe);
        uint256 firstBribeTimestamp = bribes.firstBribeTimestamp();
        uint256 k = 0;
        uint256 reward = 0;
        uint256 _endTimestamp = IMinter(bribes.minter()).active_period(); // claim until current epoch
        uint256 _userLastTime = bribes.userTimestamp(_owner, _rewardToken);

        if(_endTimestamp == _userLastTime){
            return 0;
        }

        // if user first time then set it to first bribe - week to avoid any timestamp problem
        if(_userLastTime < firstBribeTimestamp){
            _userLastTime = firstBribeTimestamp - WEEK;
        }
        console.log("firstBribeTimestamp ", firstBribeTimestamp);
        console.log("_userLastTime ", _userLastTime);

        for(k; k < 50; k++){
            if(_userLastTime == _endTimestamp){
                // if we reach the current epoch, exit
                break;
            }
            reward += _earned(_owner, _bribe, _rewardToken, _userLastTime);
            _userLastTime += WEEK;

        }
        return reward;
    }

    function _earned(address _owner, address _bribe, address _rewardToken, uint256 _timestamp) internal view returns (uint256) {
        IBribeAPI2 bribes = IBribeAPI2(_bribe);
        uint256 _balance = bribes.balanceOfOwnerAt(_owner, _timestamp);
        if(_balance == 0){
            return 0;
        } else {
            uint256 _rewardPerToken = bribes.rewardPerToken(_rewardToken, _timestamp);
            console.log("_rewardToken", _rewardToken);
            console.log("_rewardPerToken", _rewardPerToken);
            console.log("_balance", _balance);
            console.log("_timestamp", _timestamp);
            uint256 _rewards = _rewardPerToken * _balance / 1e18;
            console.log("_rewards", _rewards);
            return _rewards;
        }
    }
}

interface IBribeAPI2 {

    struct Reward {
        uint256 periodFinish;
        uint256 rewardsPerEpoch;
        uint256 lastUpdateTime;
    }
    function rewardData(address _token, uint256 ts) external view returns(Reward memory _Reward);
    function _deposit(uint amount, uint tokenId) external;
    function _withdraw(uint amount, uint tokenId) external;
    function getRewardForOwner(uint tokenId, address[] memory tokens) external;
    function notifyRewardAmount(address token, uint amount) external;
    function left(address token) external view returns (uint);
    function rewardsListLength() external view returns (uint);
    function supplyNumCheckpoints() external view returns (uint);
    //function getEpochStart(uint timestamp) external pure returns (uint);
    function getEpochStart() external pure returns (uint);
    function getNextEpochStart() external pure returns (uint);
    function getPriorSupplyIndex(uint timestamp) external view returns (uint);
    function rewardTokens(uint index) external view returns (address);
    function rewardsPerEpoch(address token,uint ts) external view returns (uint);
    function supplyCheckpoints(uint _index) external view returns(uint timestamp, uint supplyd);
    function earned(uint tokenId, address token) external view returns (uint);
    function earned(address owner, address token) external view returns (uint);
    function firstBribeTimestamp() external view returns(uint);
    function totalSupplyAt(uint256 _timestamp) external view returns (uint256);
    function balanceOfAt(uint256 tokenId, uint256 _timestamp) external view returns (uint256);
    function balanceOfOwnerAt(address owner, uint256 _timestamp) external view returns (uint256);
    function rewardPerToken(address _rewardsToken, uint256 _timestamp) external view returns (uint256);

    function minter() external view returns (IMinter);
    function ve() external view returns (IVotingEscrow);

    function userTimestamp(address _owner, address _rewardToken) external view returns (uint256);
}
