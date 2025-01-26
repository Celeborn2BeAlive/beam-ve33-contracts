//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { PERMISSIONS_REGISTRY_ADDRESS } = require("./constants.js");

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const PermissionsRegistry = await ethers.getContractAt("PermissionsRegistry", PERMISSIONS_REGISTRY_ADDRESS);

    data = await ethers.getContractFactory("GaugeFactoryV2_CL");
    input = [PermissionsRegistry.address, owner.address]
    GaugeFactoryV2_CL = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2_CL.deployed();
    console.log("GaugeFactoryV2_CL: ", GaugeFactoryV2_CL.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
