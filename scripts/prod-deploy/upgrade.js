//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veartContract = await ethers.getContractFactory("VeArtProxyUpgradeable")
    await upgrades.upgradeProxy('0x2f37885505cB4CcabBD587b1f56821A08685CD0C', veartContract);
    console.log('VeArtProxy upgraded');

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
