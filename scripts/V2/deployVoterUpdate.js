const { ethers  } = require('hardhat');

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");



async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]
    

    console.log('Deploying Contracts...');
    
    ve = '0xfbbf371c9b0b994eebfcc977cef603f7f31c070d'
    pairFactory = '0xafd89d21bdb66d00817d4153e055830b1c2b3970'
    gaugeFactoryV2 = '0x2c788fe40a417612cb654b14a944cd549b5bf130'
    bribeFactoryV3 = '0xd50ceab3071c61c85d04bdd65feb12fee7c91375'
    voter = "0x8388556C586F08DDdd9e4b113b4A4c9360746C48"


    //data = await ethers.getContractFactory("VoterV3");
    //await upgrades.upgradeProxy("0x8388556C586F08DDdd9e4b113b4A4c9360746C48", data);
    
    
    //input = [ve, pairFactory , gaugeFactoryV2,bribeFactoryV3]
    //VoterV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    //txDeployed = await VoterV3.deployed();

    //data = await ethers.getContractFactory("BribeFactoryV3");
    //await upgrades.upgradeProxy("0x597fbC82F0c6B026537CFAb42623Bb702F9CDdBc", data);

    data = await ethers.getContractFactory("DistributeFees");
    input = [voter, 175]
    VoterV3 = await upgrades.deployProxy(data, input, {initializer: 'initialize'});
    txDeployed = await VoterV3.deployed();

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
