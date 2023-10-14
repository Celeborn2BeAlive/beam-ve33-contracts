//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers, run } = require('hardhat');
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

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

//chain
async function main () {

    const zkZERO = await ethers.getContractAt("zkZERO", "0xB7675B762c683Fe8828c9102AeB5956737E1933A")

    data = await ethers.getContractFactory("zkZeroBatch");
    zkZEROBatch = await data.deploy(zkZERO.address);
    txDeployed = await zkZEROBatch.deployed();
    console.log('zkZEROBatch deployed to', zkZEROBatch.address)

    await sleep(2500)

    console.log('setting operator...')
    tx = await zkZERO.setOperator(zkZEROBatch.address);
    await tx.wait()

    await sleep(2500)

    await run("verify:verify", {
        address: zkZEROBatch.address,
        constructorArguments: [zkZERO.address],
      });

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
