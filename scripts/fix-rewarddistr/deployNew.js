//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers,network,run } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const ether = require("@openzeppelin/test-helpers/src/ether");

async function send(provider, method, params = []) {
  await provider.send(method, params);
}

async function mineBlock(provider) {
  await send(provider, "evm_mine");
}

async function increaseTime(provider, seconds) {
  await send(provider, "evm_increaseTime", [seconds]);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

//chain
async function main() {
  
  const distributorFactory = await ethers.getContractFactory("RewardsDistributorV2");

  RewardsDistributor = await distributorFactory.deploy("0xb419ce2ea99f356bae0cac47282b9409e38200fa");
  txDeployed = await RewardsDistributor.deployed();
  console.log("RewardsDistributorV2 Address: ", RewardsDistributor.address)

  await run("verify:verify", {
    address: RewardsDistributor.address,
    constructorArguments: ["0xb419ce2ea99f356bae0cac47282b9409e38200fa"],
  });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
