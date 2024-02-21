//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]
    
    data = await ethers.getContractFactory("RewardAPI");
    input = ["0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73"]
    RewardAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await RewardAPI.deployed();
    console.log("RewardAPI: ", RewardAPI.address)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
