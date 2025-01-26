//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { PERMISSIONS_REGISTRY_ADDRESS, ZERO_ADDRESS, VOTER_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const PermissionsRegistry = await ethers.getContractAt("PermissionsRegistry", PERMISSIONS_REGISTRY_ADDRESS);
    const UNIV3_FACTORY_ADDRESS = ZERO_ADDRESS; // TODO: Investigate Algebra DEX integration and replace
    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);

    data = await ethers.getContractFactory("ProtocolFeeHandler");
    FeeHandler = await data.deploy(PermissionsRegistry.address, UNIV3_FACTORY_ADDRESS, VoterV3.address);
    txDeployed = await FeeHandler.deployed();
    console.log("FeeHandler: ", FeeHandler.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
