//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { VOTER_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);

    data = await ethers.getContractFactory("DistributeFees");
    input = [VoterV3.address, 175]
    DistributeFees = await upgrades.deployProxy(data, input, {initializer: 'initialize'});
    txDeployed = await DistributeFees.deployed();
    console.log("DistributeFees: ", DistributeFees.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
