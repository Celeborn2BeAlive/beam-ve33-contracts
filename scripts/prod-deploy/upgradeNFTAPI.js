//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veartContract = await ethers.getContractFactory("veNFTAPI")
    tx = await upgrades.prepareUpgrade('0x545e0Af21a89Da6Bd72c3a247f9F6D116F9c21c1', veartContract);
    console.log('VeArtProxy upgraded', tx);

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
