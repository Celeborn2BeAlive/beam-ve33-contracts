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

    var signer = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    var receiver = "0x026F9a7B3664a16c01c29F86092a6348adbf6638"
    const cash = await ethers.getContractAt("Retro", "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175", signer)
    
    data = await ethers.getContractFactory("zkZERO", signer);
    zkZERO = await data.deploy(1200, (new Date().getTime() / 1000).toFixed(0), receiver);
    txDeployed = await zkZERO.deployed();
    console.log('zkZERO deployed to', zkZERO.address)

    async function print(){
        console.log('Total NFT Supply: ' + await zkZERO.totalSupply())
        console.log('Total NFT Balance: ' + await zkZERO.balanceOf(signer.address))
        console.log('Total Cash Balance: ' + await cash.balanceOf(signer.address))
        console.log('Total Cash Balance of Multisig: ' + await cash.balanceOf(receiver))
    }

    await print()
    console.log('NFT price: ' + await zkZERO.NFT_PRICE())
    console.log('Start time: ' + await zkZERO.SALE_START_TIMESTAMP())

    const provider = waffle.provider
    await increaseTime(provider, 100) //100 seconds
    await mineBlock(provider)

    tx = await cash.approve(zkZERO.address, "100000000000000000000");
    await tx.wait()

    console.log('minting')
    tx = await zkZERO.mint();
    await tx.wait();
    await print()

    console.log('minting')
    tx = await zkZERO.mint();
    await tx.wait();
    await print()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
