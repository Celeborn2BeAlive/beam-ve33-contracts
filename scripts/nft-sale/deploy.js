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

    const receiver = "0x35dCEaD4670161a3D123b007922d61378D3A9d18";

    data = await ethers.getContractFactory("zkZERO");
    zkZERO = await data.deploy(1695859200, receiver);
    txDeployed = await zkZERO.deployed();
    console.log('zkZERO deployed to', zkZERO.address);

    await run("verify:verify", {
        address: zkZERO.address,
        constructorArguments: [1695859200, receiver],
      });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
