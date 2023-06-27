const { ethers  } = require('hardhat');

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");



async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]

    const voter = ethers.utils.getAddress("0x8388556C586F08DDdd9e4b113b4A4c9360746C48")
    const rewDistro = ethers.utils.getAddress("0xcbbfb57f8B32100DeDF08eD2D4a481c35d8EceaE")
    
   // deploy
   data = await ethers.getContractFactory("PairAPI");        
   input = [voter]
   PairAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
   txDeployed = await PairAPI.deployed();
   console.log("PairAPI: ", PairAPI.address)


   // deploy
   data = await ethers.getContractFactory("RewardAPI");        
   input = [voter]
   RewardAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
   txDeployed = await RewardAPI.deployed();
   console.log("RewardAPI: ", RewardAPI.address)

   // deploy
   data = await ethers.getContractFactory("veNFTAPI");        
   input = [voter, rewDistro, PairAPI.address]
   veNFTAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
   txDeployed = await veNFTAPI.deployed();
   console.log("veNFTAPI: ", veNFTAPI.address)

   /*const data = await ethers.getContractFactory('PairAPI');
   console.log('PairAPI...');
   await upgrades.upgradeProxy('0xE89080cEb6CAEb9Eba5a0d4Aa13686eFcB78A32E', data);
   console.log('PairAPI upgraded');*/
    

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
