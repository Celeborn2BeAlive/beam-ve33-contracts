const { ethers  } = require('hardhat');

//const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");



async function main () {

  data = await ethers.getContractFactory("PairFactoryUpgradeable");
  pairFactory = await upgrades.deployProxy(data, [], {initializer: 'initialize'});
  txDeployed = await pairFactory.deployed();
  console.log("pairFactory: ", pairFactory.address)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
