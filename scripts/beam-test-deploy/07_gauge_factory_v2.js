//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { PERMISSIONS_REGISTRY_ADDRESS } = require("./constants.js");

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const PermissionsRegistry = await ethers.getContractAt("PermissionsRegistry", PERMISSIONS_REGISTRY_ADDRESS);

    data = await ethers.getContractFactory("GaugeFactoryV2");
    input = [PermissionsRegistry.address]
    GaugeFactoryV2 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2.deployed();
    console.log("GaugeFactoryV2: ", GaugeFactoryV2.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
