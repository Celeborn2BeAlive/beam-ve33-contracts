//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { TOKEN_ADDRESS } = require("./constants.js");

// Depends on 00_token.js

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contracts... Owner is: ' + owner.address);

    retro = await ethers.getContractAt("Retro", TOKEN_ADDRESS);
    console.log("retro Address: ", retro.address)

    // initial mint
    tx = await retro.initialMint(owner.address)
    await tx.wait()
    console.log('initial mint of 50M RETRO to ' + owner.address)

    console.log('/////////////////////////')
    console.log('check up')
    console.log('/////////////////////////')

    console.log('RETRO owner balance (should be 50000000000000000000000000): ' + await retro.balanceOf(owner.address))
    console.log('RETRO initial minted (should be true): ' + await retro.initialMinted())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
