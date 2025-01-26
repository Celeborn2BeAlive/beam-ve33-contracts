//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { GAUGE_FACTORY_V2_CL_ADDRESS, PROTOCOL_FEE_HANDLER_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const GaugeFactoryV2_CL = await ethers.getContractAt("GaugeFactoryV2_CL", GAUGE_FACTORY_V2_CL_ADDRESS)
    const FeeHandler = await ethers.getContractAt("ProtocolFeeHandler", PROTOCOL_FEE_HANDLER_ADDRESS);

    tx = await GaugeFactoryV2_CL.setFeeHandler(FeeHandler.address);
    await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
