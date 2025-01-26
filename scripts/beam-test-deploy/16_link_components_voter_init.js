//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { TOKEN_ADDRESS, MINTER_ADDRESS, VOTER_V3_ADDRESS, PERMISSIONS_REGISTRY_ADDRESS } = require('./constants');

whitelisted_tokens = []

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);
    const retro = await ethers.getContractAt("Retro", TOKEN_ADDRESS);
    const minter = await ethers.getContractAt("MinterUpgradeable", MINTER_ADDRESS);
    const PermissionsRegistry = await ethers.getContractAt("PermissionsRegistry", PERMISSIONS_REGISTRY_ADDRESS);

    // 1. _init() Voter with whitelisted tokens (u can do it later), permission reg and minter
    whitelisted_tokens.push(retro.address)
    tx = await VoterV3._init(whitelisted_tokens, PermissionsRegistry.address, minter.address)
    await tx.wait()
    console.log('finished init of VoterV3')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
