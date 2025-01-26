//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { TOKEN_ADDRESS, MINTER_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const retro = await ethers.getContractAt("Retro", TOKEN_ADDRESS);
    const minter = await ethers.getContractAt("MinterUpgradeable", MINTER_ADDRESS);

    if (await retro.minter() != owner.address) {
      throw new Error(`${owner.address} is not the minter`)
    }

    // 0. set minter role in retro
    tx = await retro.setMinter(minter.address)
    await tx.wait()
    console.log('set MinterUpgradeable as minter for Retro')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
