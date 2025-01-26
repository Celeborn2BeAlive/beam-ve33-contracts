//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { VOTER_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);

    data = await ethers.getContractFactory("RewardAPI");
    input = [VoterV3.address]
    RewardAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await RewardAPI.deployed();
    console.log("RewardAPI: ", RewardAPI.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
