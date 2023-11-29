//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function send(provider, method, params = []) {
    await provider.send(method, params)
}

async function mineBlock(provider) {
    await send(provider, "evm_mine")
}
  
async function increaseTime(provider, seconds) {
    await send(provider, "evm_increaseTime", [seconds])
}

async function main () {

  const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");  
  const CashArb = await ethers.getContractAt("ArbBurn", "0x3156a3f6593068db271b4f18fd3c0a01e305b2f1", impersonateMyself)
  const usdc = await ethers.getContractAt("Retro", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174")
  console.log('starting')
  console.log('balance before', await usdc.balanceOf("0x026F9a7B3664a16c01c29F86092a6348adbf6638"))
  tx = await CashArb.wokrAndDistributeProfits("200000000000");
  await tx.wait()
  console.log('done')
  console.log('balance after', await usdc.balanceOf("0x026F9a7B3664a16c01c29F86092a6348adbf6638"))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
