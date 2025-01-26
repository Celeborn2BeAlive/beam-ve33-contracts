//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { GAUGE_FACTORY_V2_CL_ADDRESS, PROTOCOL_FEE_HANDLER_ADDRESS, VOTER_V3_ADDRESS, BRIBE_FACTORY_V3_ADDRESS, MINTER_ADDRESS, TOKEN_ADDRESS, VEARTPROXY_ADDRESS, VERETRO_ADDRESS, REWARDS_DISTRIBUTOR_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const GaugeFactoryV2_CL = await ethers.getContractAt("GaugeFactoryV2_CL", GAUGE_FACTORY_V2_CL_ADDRESS);
    const FeeHandler = await ethers.getContractAt("ProtocolFeeHandler", PROTOCOL_FEE_HANDLER_ADDRESS);
    const VoterV3 = await ethers.getContractAt("VoterV3", VOTER_V3_ADDRESS);
    const BribeFactoryV3 = await ethers.getContractAt("BribeFactoryV3", BRIBE_FACTORY_V3_ADDRESS);
    const retro = await ethers.getContractAt("Retro", TOKEN_ADDRESS);
    const minter = await ethers.getContractAt("MinterUpgradeable", MINTER_ADDRESS);
    const veArtProxy = await ethers.getContractAt("VeArtProxyUpgradeable", VEARTPROXY_ADDRESS);
    const veRETRO = await ethers.getContractAt("VotingEscrow", VERETRO_ADDRESS);
    const RewardsDistributor = await ethers.getContractAt("RewardsDistributorV2", REWARDS_DISTRIBUTOR_ADDRESS);

    console.log('/////////////////////////')
    console.log('check up')
    console.log('/////////////////////////')

    console.log('RETRO minter role owner (should be ' + minter.address + '): ' + await retro.minter())

    console.log('veRETRO artProxy (should be '+ veArtProxy.address +'): ' + await veRETRO.artProxy())
    console.log('veRETRO team (should be '+ owner.address +'): ' + await veRETRO.team())
    console.log('veRETRO voter (should be '+ VoterV3.address +'): ' + await veRETRO.voter())

    console.log('RewardsDistributorV2 depositor (should be '+ minter.address +'): ' + await RewardsDistributor.depositor())
    console.log('RewardsDistributorV2 token (should be '+ retro.address +'): ' + await RewardsDistributor.token())
    console.log('RewardsDistributorV2 veRETRO (should be '+ veRETRO.address +'): ' + await RewardsDistributor.voting_escrow())

    console.log('BribeFactoryV3 voter (should be '+ VoterV3.address +'): ' + await BribeFactoryV3.voter())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
