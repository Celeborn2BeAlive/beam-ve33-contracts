//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { GAUGE_FACTORY_V2_CL_ADDRESS, VOTER_V3_ADDRESS, ZERO_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);
    const GaugeFactoryV2_CL = await ethers.getContractAt("GaugeFactoryV2_CL", GAUGE_FACTORY_V2_CL_ADDRESS)
    const UNIV3_FACTORY_ADDRESS = ZERO_ADDRESS; // TODO: Investigate Algebra DEX integration and replace

    // 2. Add GaugeFactoryV2_CL + AlgebraFactory in Voter if CL is used (can be added later if Algebra is not ready)
    tx = await VoterV3.addFactory(UNIV3_FACTORY_ADDRESS, GaugeFactoryV2_CL.address);
    await tx.wait()
    console.log('added GaugeFactoryV2_CL as factory for VoterV3')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
