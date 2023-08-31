//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle")

async function send(provider, method, params = []) {
    await provider.send(method, params)
}

async function mineBlock(provider) {
    await send(provider, "evm_mine")
}
  
async function increaseTime(provider, seconds) {
    await send(provider, "evm_increaseTime", [seconds])
}

//chain
async function main () {


    const buffer = 0; //0
    const signer = ethers.provider.getSigner();

    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)

    tx = await voter.setVoteDelay(buffer)
    await tx.wait()
    console.log('set vote delay to ' + buffer)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
