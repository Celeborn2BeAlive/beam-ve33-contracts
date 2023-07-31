//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veartContract = await ethers.getContractFactory("PairAPI")
    await upgrades.upgradeProxy('0xDF5ed9869721A37981359fA5a617D53Ef1B7e8b5', veartContract);
    console.log('VeArtProxy upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
