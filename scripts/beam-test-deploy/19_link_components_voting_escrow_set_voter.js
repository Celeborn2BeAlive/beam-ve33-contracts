//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { VERETRO_ADDRESS, VOTER_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veRETRO = await ethers.getContractAt("VotingEscrow", VERETRO_ADDRESS);
    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);

    // 5. Make sure VOTER is set in veRETRO (setVoter())
    tx = await veRETRO.setVoter(VoterV3.address)
    await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
