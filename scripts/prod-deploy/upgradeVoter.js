//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers,network,run, upgrades } = require("hardhat");
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

  const proxy = "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73"
  const addressNewImpl = "0x5Cd2fD124A4581cf314dBCAb240c36b0F52A60f5"
  
  // const veartContract = await ethers.getContractFactory("VoterV3")
  // addressNewImpl = await upgrades.prepareUpgrade(proxy, veartContract);
  // console.log('new implementation address is', addressNewImpl)

  await run("verify:verify", {
    address: addressNewImpl,
    constructorArguments: [],
  });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
