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

    var addressToImpersonate = "0xc8949dbaf261365083a4b46ab683BaE1C9273203" //deployer

    var signer = await ethers.getImpersonatedSigner(addressToImpersonate);

    const provider = waffle.provider

    await increaseTime(provider, 86400 * 2) //2 days
    await mineBlock(provider)

    const voter = await ethers.getContractAt("VoterV3", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)

    //tx = await voter.distributeAll()
    //console.log(voter)
    tx = await voter['distribute(uint256,uint256)'](19,19)
    await tx.wait()    
    console.log('done')

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
