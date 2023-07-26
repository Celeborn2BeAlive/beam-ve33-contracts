//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');


async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contracts... Owner is: ' + owner.address);
    
    retro = await ethers.getContractAt("Retro", "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb");
    minter = await ethers.getContractAt("MinterUpgradeable", "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb");
    console.log("retro Address: ", retro.address)

    // pass univ3 permissions to feeHandler
    // create gauges
    // initialize minter
   
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
