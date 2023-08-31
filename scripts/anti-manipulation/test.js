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


    const buffer = 604800 / 7; //1 day
    const tokenId = 10123;
    var signer = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    var voterSigner = await ethers.getImpersonatedSigner("0x026f9a7b3664a16c01c29f86092a6348adbf6638");

    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)
    const voterVoting = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", voterSigner)
    
    tx = await voterVoting.vote(tokenId, ["0xaC44f57eEF260eB6E0f896b61984Da8d86FeE9ed"], [100])
    await tx.wait()
    console.log('voted first time')

    tx = await voter.setVoteDelay(buffer)
    await tx.wait()
    console.log('set vote delay')

    tx = await voter.setVoteDelay(0)
    await tx.wait()
    console.log('set vote delay to 0')

    tx = await voterVoting.vote(tokenId, ["0xaC44f57eEF260eB6E0f896b61984Da8d86FeE9ed"], [100])
    await tx.wait()
    console.log('voted second time')

    tx = await voter.setVoteDelay(buffer)
    await tx.wait()
    console.log('set vote delay')

    const provider = waffle.provider
    await increaseTime(provider, 86400) //1 day
    await mineBlock(provider)
    console.log('tomorrow!')

    tx = await voter.distribute(["0x6315d75055c217E03916d726Dcc768B610d3FF50"]) //new epoch
    await tx.wait()
    console.log('distributing')

    tx = await voterVoting.vote(tokenId, ["0xaC44f57eEF260eB6E0f896b61984Da8d86FeE9ed"], [100])
    await tx.wait()
    console.log('voted second time after delay in new epoch')

    tx = await voter.setVoteDelay(0)
    await tx.wait()
    console.log('set vote delay to 0')

    tx = await voterVoting.vote(tokenId, ["0xaC44f57eEF260eB6E0f896b61984Da8d86FeE9ed"], [100])
    await tx.wait()
    console.log('voted third time after delay in new epoch')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
