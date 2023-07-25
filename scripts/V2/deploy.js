const { ethers  } = require('hardhat');

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");



async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]

    // deployed on v1 
    const ve = ethers.utils.getAddress("0x83AA7C0074f128434d7c5Dc1AeC36266E36d484E")
    const pairFactory = ethers.utils.getAddress("0x1fC46294195aA87F77fAE299A14Bd1728dC1Cca9")

    console.log('Deploying Contracts...');
    
    
    // PERMISSION REGISTRY
    /*data = await ethers.getContractFactory("PermissionsRegistry");
    PermissionsRegistry = await data.deploy();
    txDeployed = await PermissionsRegistry.deployed();
    console.log("PermissionsRegistry: ", PermissionsRegistry.address)

    // BRIBE FACTORY
    data = await ethers.getContractFactory("BribeFactoryV3");
    input = [ZERO_ADDRESS, PermissionsRegistry.address]
    BribeFactoryV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await BribeFactoryV3.deployed();
    console.log("BribeFactoryV3: ", BribeFactoryV3.address)*/

    const oRetro = {"address": "0xE8386A9D2B59e755F41020Fc408B0D828Fd7ea7c"};

    // GAUGE FACTORY
    data = await ethers.getContractFactory("GaugeFactoryV2");
    input = [PermissionsRegistry.address]
    GaugeFactoryV2 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2.deployed();
    await GaugeFactoryV2.setORetro(oRetro.address);
    console.log("GaugeFactoryV2: ", GaugeFactoryV2.address)

    // GAUGE FACTORY _ CL
    data = await ethers.getContractFactory("GaugeFactoryV2_CL");
    input = [PermissionsRegistry.address, '0xc8949dbaf261365083a4b46ab683BaE1C9273203']
    GaugeFactoryV2_CL = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2_CL.deployed();
    await GaugeFactoryV2_CL.setORetro(oRetro.address);
    console.log("GaugeFactoryV2_CL: ", GaugeFactoryV2_CL.address)

    /*const GaugeFactoryV2Address = "0xD6b8faF86Aa90cbFf34CF8161f35eFC8dd59056c"
    const BribeFactoryV3Address = "0x597fbC82F0c6B026537CFAb42623Bb702F9CDdBc"
    // VOTER
    data = await ethers.getContractFactory("VoterV3");
    input = [ve, pairFactory , GaugeFactoryV2Address,BribeFactoryV3Address]
    VoterV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await VoterV3.deployed();
    console.log("VoterV3: ", VoterV3.address)*/

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
