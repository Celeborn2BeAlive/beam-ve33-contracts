//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { VERETRO_ADDRESS } = require("./constants.js");

// Depends on 03_voting_escrow.js

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veRETRO = await ethers.getContractAt("VotingEscrow", VERETRO_ADDRESS);

    data = await ethers.getContractFactory("RewardsDistributorV2");
    RewardsDistributor = await data.deploy(veRETRO.address);
    txDeployed = await RewardsDistributor.deployed();
    console.log("RewardsDistributorV2 Address: ", RewardsDistributor.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
