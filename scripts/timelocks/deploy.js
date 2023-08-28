//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers,network } = require("hardhat");
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

  const signer = ethers.provider.getSigner();

  data = await ethers.getContractFactory("StablTimelock", signer);
  timelock = await data.deploy();
  txDeployed = await timelock.deployed();
  console.log('deployed to', timelock.address)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
