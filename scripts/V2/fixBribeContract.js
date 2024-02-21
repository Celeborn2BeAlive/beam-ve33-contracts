const { ethers  } = require('hardhat');

const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");



async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]
    

    console.log('Deploying Contracts...');
    
    owner = "0xc8949dbaf261365083a4b46ab683BaE1C9273203"
    voter = "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73"
    bribeFactory = "0x601b14aCb5C340f2a12Ee9D3BE0B0828E5619081"
    type = "Retro LP Fees: WBTC-WETH-500"

    data = await ethers.getContractFactory("Bribe");
    bribe = await data.deploy(owner, voter, bribeFactory, type);
    txDeployed = await bribe.deployed();
    console.log("bribe: ", bribe.address)


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
