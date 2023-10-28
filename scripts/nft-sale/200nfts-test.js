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
    var buyer = "0x026F9a7B3664a16c01c29F86092a6348adbf6638"

    const cash = await ethers.getContractAt("Retro", "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175", impersonateMyself)

    const zkZERO = await ethers.getContractAt("zkZERO", "0xB7675B762c683Fe8828c9102AeB5956737E1933A", impersonateMyself)
    const hateLife = await ethers.getContractFactory("HateMyLife", impersonateMyself)

    HateLife = await hateLife.deploy();
    txDeployed = await HateLife.deployed();
    console.log('HateLife deployed to', HateLife.address)

    console.log('transfering cash...')
    tx = await cash.transfer(HateLife.address, "250");
    await tx.wait()

    console.log('balanceNftBefore', await zkZERO.balanceOf(buyer))
    console.log('NftPriceBefore', await zkZERO.prices(cash.address))
    console.log('NftSupplyBefore', await zkZERO.totalSupply())
    console.log('zkZEROownerBefore', await zkZERO.owner())
    console.log('zkZEROOperatorBefore', await zkZERO.operator())

    console.log('tranfsering operator...')
    tx = await zkZERO.setOperator(HateLife.address);
    await tx.wait()

    console.log('tranfsering ownership...')
    tx = await zkZERO.transferOwnership(HateLife.address);
    await tx.wait()

    console.log('minting...')
    tx = await HateLife.KillMe(buyer);
    await tx.wait()

    console.log('balanceNftAfter', await zkZERO.balanceOf(buyer))
    console.log('NftPriceAfter', await zkZERO.prices(cash.address))
    console.log('NftSupplyAfter', await zkZERO.totalSupply())
    console.log('zkZEROownerAfter', await zkZERO.owner())
    console.log('zkZEROOperatorAfter', await zkZERO.operator())
    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
