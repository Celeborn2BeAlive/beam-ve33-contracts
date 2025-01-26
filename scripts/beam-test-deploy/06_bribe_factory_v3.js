//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { PERMISSIONS_REGISTRY_ADDRESS, ZERO_ADDRESS } = require("./constants.js");

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const PermissionsRegistry = await ethers.getContractAt("PermissionsRegistry", PERMISSIONS_REGISTRY_ADDRESS);

    data = await ethers.getContractFactory("BribeFactoryV3");
    input = [ZERO_ADDRESS, PermissionsRegistry.address]
    BribeFactoryV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await BribeFactoryV3.deployed();
    console.log("BribeFactoryV3: ", BribeFactoryV3.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
