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

  const proxy = "0x003D505Aff54FB7856aA6Bcb56a8397F5aF89479"
  
  const veartContract = await ethers.getContractFactory("MinterUpgradeable")
  addressNewImpl = await upgrades.prepareUpgrade(proxy, veartContract);
  console.log('new implementation address is', addressNewImpl)

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
