//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { VOTER_V3_ADDRESS, BRIBE_FACTORY_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);
    const BribeFactoryV3 = await ethers.getContractAt("BribeFactoryV3", BRIBE_FACTORY_V3_ADDRESS)

    tx = await BribeFactoryV3.setVoter(VoterV3.address)
    await tx.wait()
    console.log('set Voter for Bribe Factory')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
