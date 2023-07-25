//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");

//chain
const wmatic = {"address":"0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"}
    
//UNISWAPV3
const univ3_factory = {"address": "0x91e1B99072f238352f59e58de875691e20Dc19c1"};

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contracts... Owner is: ' + owner.address);
    
    data = await ethers.getContractFactory("Retro");
    retro = await data.deploy();
    txDeployed = await retro.deployed();
    console.log("retro Address: ", retro.address)
    
    data = await ethers.getContractFactory("VeArtProxyUpgradeable");
    veArtProxy = await upgrades.deployProxy(data,[], {initializer: 'initialize'});
    txDeployed = await veArtProxy.deployed();
    console.log("veArtProxy Address: ", veArtProxy.address)

    data = await ethers.getContractFactory("VotingEscrow");
    veRETRO = await data.deploy(retro.address, veArtProxy.address);
    txDeployed = await veRETRO.deployed();
    console.log("veRETRO Address: ", veRETRO.address);

    data = await ethers.getContractFactory("RewardsDistributorV2");
    RewardsDistributor = await data.deploy(veRETRO.address);
    txDeployed = await RewardsDistributor.deployed();
    console.log("RewardsDistributorV2 Address: ", RewardsDistributor.address)

    data = await ethers.getContractFactory("PairFactoryUpgradeable");
    pairFactory = await upgrades.deployProxy(data, [], {initializer: 'initialize'});
    txDeployed = await pairFactory.deployed();
    console.log("pairFactory (classic): ", pairFactory.address)

    data = await ethers.getContractFactory("RouterV2");
    RouterV2 = await data.deploy(pairFactory.address, wmatic.address);
    txDeployed = await RouterV2.deployed();
    console.log("RouterV2 Address: ", RouterV2.address)

    data = await ethers.getContractFactory("PermissionsRegistry");
    PermissionsRegistry = await data.deploy();
    txDeployed = await PermissionsRegistry.deployed();
    console.log("PermissionsRegistry: ", PermissionsRegistry.address)

    const roles = ["VOTER_ADMIN", "GOVERNANCE", "GAUGE_ADMIN", "BRIBE_ADMIN", "FEE_MANAGER", "CL_FEES_VAULT_ADMIN"]

    for(let role of roles){
        await PermissionsRegistry.setRoleFor(owner.address, role);
    }

    data = await ethers.getContractFactory("BribeFactoryV3");
    input = [ZERO_ADDRESS, PermissionsRegistry.address]
    BribeFactoryV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await BribeFactoryV3.deployed();
    console.log("BribeFactoryV3: ", BribeFactoryV3.address)

    // TODO: deploy oRETRO
    const oRetro = {"address": "0xE8386A9D2B59e755F41020Fc408B0D828Fd7ea7c"};

    data = await ethers.getContractFactory("GaugeFactoryV2");
    input = [PermissionsRegistry.address]
    GaugeFactoryV2 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2.deployed();
    if(oRetro != undefined && oRetro.address != ZERO_ADDRESS){
        await GaugeFactoryV2.setORetro(oRetro.address);
    }else{
        console.log("No oRetro address to set for GaugeFactoryV2")
    }
    console.log("GaugeFactoryV2: ", GaugeFactoryV2.address)

    data = await ethers.getContractFactory("GaugeFactoryV2_CL");
    input = [PermissionsRegistry.address, owner.address]
    GaugeFactoryV2_CL = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2_CL.deployed();
    if(oRetro != undefined && oRetro.address != ZERO_ADDRESS){
        await GaugeFactoryV2_CL.setORetro(oRetro.address);
    }else{
        console.log("No oRetro address to set for GaugeFactoryV2_CL")
    }
    console.log("GaugeFactoryV2_CL: ", GaugeFactoryV2_CL.address)

    data = await ethers.getContractFactory("VoterV3");
    input = [veRETRO.address, pairFactory.address, GaugeFactoryV2.address, BribeFactoryV3.address]
    VoterV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await VoterV3.deployed();
    console.log("VoterV3: ", VoterV3.address)

    await VoterV3.addFactory(univ3_factory.address, GaugeFactoryV2.address);
    console.log('added GaugeFactoryV2 as factory for VoterV3')

    data = await ethers.getContractFactory("MinterUpgradeable");
    input = [VoterV3.address, veRETRO.address, RewardsDistributor.address]
    minter = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await minter.deployed();
    console.log("Minter: ", minter.address)

    data = await ethers.getContractFactory("PairAPI");
    input = [VoterV3.address]
    PairAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await PairAPI.deployed();
    console.log("PairAPI: ", PairAPI.address)

    data = await ethers.getContractFactory("RewardAPI");
    input = [VoterV3.address]
    RewardAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await RewardAPI.deployed();
    console.log("RewardAPI: ", RewardAPI.address)

    data = await ethers.getContractFactory("veNFTAPI");
    input = [VoterV3.address, RewardsDistributor.address, PairAPI.address]
    veNFTAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await veNFTAPI.deployed();
    console.log("veNFTAPI: ", veNFTAPI.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
