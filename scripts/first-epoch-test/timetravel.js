//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle")

const provider = waffle.provider

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

    const addressToImpersonate = "0xc8949dbaf261365083a4b46ab683BaE1C9273203"

    // impersonate the deployer
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [addressToImpersonate],
    });

    const signer = ethers.provider.getSigner(addressToImpersonate);

    //const signer = ethers.provider.getSigner();

    const provider = waffle.provider

    await increaseTime(provider, 86400 * 5) //5 days
    await mineBlock(provider)

    

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
