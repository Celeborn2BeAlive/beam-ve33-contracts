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

    const receiver = ;

    data = await ethers.getContractFactory("zkZERO");
    zkZERO = await data.deploy((new Date().getTime() / 1000).toFixed(0), receiver);
    txDeployed = await zkZERO.deployed();
    console.log('zkZERO deployed to', zkZERO.address)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
