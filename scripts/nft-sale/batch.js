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

    var impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    var impersonateBuyer = await ethers.getImpersonatedSigner("0x03a1a0ee0e2a14bd069c8691a4adeabfa6a4d709");
    var impersonateBuyerTwo = await ethers.getImpersonatedSigner("0x55d8ba4008185bfcfc2051860745d09688ddebc3");

    const cash = await ethers.getContractAt("Retro", "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175", impersonateBuyer)
    const zkZERO = await ethers.getContractAt("zkZERO", "0xB7675B762c683Fe8828c9102AeB5956737E1933A", impersonateMyself)

    const cashBuyerTwo = await ethers.getContractAt("Retro", "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175", impersonateBuyerTwo)

    data = await ethers.getContractFactory("zkZeroBatch", impersonateBuyer);
    zkZEROBatch = await data.deploy(zkZERO.address);
    txDeployed = await zkZEROBatch.deployed();
    console.log('zkZEROBatch deployed to', zkZEROBatch.address)

    const zkZEROBatchTwo = await ethers.getContractAt("zkZeroBatch", zkZEROBatch.address, impersonateBuyerTwo)

    console.log('setting operator...')
    tx = await zkZERO.setOperator(zkZEROBatch.address);
    await tx.wait()

    console.log('approving cash...')
    tx = await cash.approve(zkZEROBatch.address, "999999999999999999999999999999999");
    await tx.wait()
    tx = await cashBuyerTwo.approve(zkZEROBatch.address, "999999999999999999999999999999999");
    await tx.wait()

    console.log('buyers balance nft before', await zkZERO.balanceOf(impersonateBuyer.address))
    console.log('batch contract balance nft before', await zkZERO.balanceOf(zkZEROBatch.address))
    console.log('buyer cash balance before', await cash.balanceOf(impersonateBuyer.address))

    tx = await zkZEROBatch.batchMint(cash.address, 100);
    await tx.wait()

    console.log('buyer balance nft after', await zkZERO.balanceOf(impersonateBuyer.address))
    console.log('batch contract balance nft after', await zkZERO.balanceOf(zkZEROBatch.address))
    console.log('buyer cash balance after', await cash.balanceOf(impersonateBuyer.address))

    console.log('buyer2 balance nft before', await zkZERO.balanceOf(impersonateBuyerTwo.address))
    console.log('batch contract balance nft before', await zkZERO.balanceOf(zkZEROBatchTwo.address))
    console.log('buyer2 cash balance before', await cash.balanceOf(impersonateBuyerTwo.address))

    tx = await zkZEROBatchTwo.batchMint(cash.address, 50);
    await tx.wait()

    console.log('buyer2 balance nft after', await zkZERO.balanceOf(impersonateBuyerTwo.address))
    console.log('batch contract balance nft after', await zkZERO.balanceOf(zkZEROBatchTwo.address))
    console.log('buyer2 cash balance after', await cash.balanceOf(impersonateBuyerTwo.address))
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
