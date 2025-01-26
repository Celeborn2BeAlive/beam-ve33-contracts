//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { REWARDS_DISTRIBUTOR_ADDRESS, PAIR_API_ADDRESS, VOTER_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);
    const RewardsDistributor = await ethers.getContractAt("RewardsDistributorV2", REWARDS_DISTRIBUTOR_ADDRESS);
    const PairAPI = await ethers.getContractAt("PairAPI", PAIR_API_ADDRESS);

    data = await ethers.getContractFactory("veNFTAPI");
    input = [VoterV3.address, RewardsDistributor.address, PairAPI.address]
    veNFTAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await veNFTAPI.deployed();
    console.log("veNFTAPI: ", veNFTAPI.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
