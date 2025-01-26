//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { REWARDS_DISTRIBUTOR_ADDRESS, VOTER_V3_ADDRESS, VERETRO_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);
    const veRETRO = await ethers.getContractAt("VotingEscrow", VERETRO_ADDRESS);
    const RewardsDistributor = await ethers.getContractAt("RewardsDistributorV2", REWARDS_DISTRIBUTOR_ADDRESS);

    data = await ethers.getContractFactory("MinterUpgradeable");
    input = [VoterV3.address, veRETRO.address, RewardsDistributor.address]
    minter = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await minter.deployed();
    console.log("Minter: ", minter.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
