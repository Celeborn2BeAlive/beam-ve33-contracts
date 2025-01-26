//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { VERETRO_ADDRESS, PAIR_FACTORY_ADDRESS, GAUGE_FACTORY_V2_ADDRESS, BRIBE_FACTORY_V3_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veRETRO = await ethers.getContractAt("VotingEscrow", VERETRO_ADDRESS);
    const pairFactory = await ethers.getContractAt("PairFactory", PAIR_FACTORY_ADDRESS)
    const GaugeFactoryV2 = await ethers.getContractAt("GaugeFactoryV2", GAUGE_FACTORY_V2_ADDRESS)
    const BribeFactoryV3 = await ethers.getContractAt("BribeFactoryV3", BRIBE_FACTORY_V3_ADDRESS)

    data = await ethers.getContractFactory("VoterV3");
    input = [veRETRO.address, pairFactory.address, GaugeFactoryV2.address, BribeFactoryV3.address]
    VoterV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await VoterV3.deployed();
    console.log("VoterV3: ", VoterV3.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
