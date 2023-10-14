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
    var impersonateBuyer = await ethers.getImpersonatedSigner("0x0Bca0F5D3C7FF6a8344F9a821653D38Ed7Dc6Fde");

    await impersonateMyself.sendTransaction({
        to: impersonateBuyer.address,
        value: ethers.utils.parseEther("20"),
        });

    const cash = await ethers.getContractAt("Retro", "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", impersonateBuyer)
    const zkZERO = await ethers.getContractAt("zkZERO", "0xB7675B762c683Fe8828c9102AeB5956737E1933A")
    const zkZEROBatch = await ethers.getContractAt("zkZeroBatch", "0xbd95d199988d6F5b41Db12b9a0e3F37E43011F26", impersonateBuyer)


    console.log('approving cash...')
    tx = await cash.approve(zkZEROBatch.address, "999999999999999999999999999999999");
    await tx.wait()

    console.log('buyers balance nft before', await zkZERO.balanceOf(impersonateBuyer.address))
    console.log('batch contract balance nft before', await zkZERO.balanceOf(zkZEROBatch.address))
    console.log('buyer cash balance before', await cash.balanceOf(impersonateBuyer.address))

    tx = await zkZEROBatch.batchMint(cash.address, 2);
    await tx.wait()
    const receipt = await tx.wait()

    console.log(receipt)

    console.log('buyer balance nft after', await zkZERO.balanceOf(impersonateBuyer.address))
    console.log('batch contract balance nft after', await zkZERO.balanceOf(zkZEROBatch.address))
    console.log('buyer cash balance after', await cash.balanceOf(impersonateBuyer.address))

    
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
