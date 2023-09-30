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

    var specimen = "0x026F9a7B3664a16c01c29F86092a6348adbf6638";
    
    data = await ethers.getContractAt("VotingEscrow", "0xB419cE2ea99f356BaE0caC47282B9409E38200fa");

    console.log(await data.checkpoints(specimen, 16))

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
