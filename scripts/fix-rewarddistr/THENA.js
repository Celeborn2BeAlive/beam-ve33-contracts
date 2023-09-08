//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers,network } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const ether = require("@openzeppelin/test-helpers/src/ether");

async function send(provider, method, params = []) {
  await provider.send(method, params);
}

async function mineBlock(provider) {
  await send(provider, "evm_mine");
}

async function increaseTime(provider, seconds) {
  await send(provider, "evm_increaseTime", [seconds]);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

//chain
async function main() {

  const minterAd = "0x86069FEb223EE303085a1A505892c9D4BdBEE996"
  const distributorAd = "0xC6bE40f6a14D4C2F3AAdf9b02294b003e3967779"

  const impersonateReceiver = await ethers.getImpersonatedSigner("0xd631201ff86ae66a8f5c742aa4744166576df565");

  RETRO = await ethers.getContractAt("Retro", "0xF4C8E32EaDEC4BFe97E0F595AdD0f4450a863a11", impersonateReceiver)
  veRETRO = await ethers.getContractAt("VotingEscrow", "0xfBBF371C9B0B994EebFcC977CEf603F7f31c070D", impersonateReceiver);

  const minter = await ethers.getContractAt("MinterUpgradeable", minterAd, impersonateReceiver);

  distributor = await ethers.getContractAt("RewardsDistributorV2", distributorAd, impersonateReceiver);

  await network.provider.send("hardhat_setNextBlockBaseFeePerGas", [
    "0x2540be400", // 10 gwei
  ]);

  tx = await RETRO.approve(veRETRO.address, "100000000000000000000")
  await tx.wait()
  newLock = await veRETRO.create_lock("100000000000000000000",4092000) //100 retro 50 days
  await newLock.wait()

  tokenId = await veRETRO.tokenOfOwnerByIndex(impersonateReceiver.address, 0)

  console.log('claimable before updating period NEW NFT', await distributor.claimable(tokenId))
  await mineBlock(network.provider)
  await increaseTime(network.provider, 86400 * 4) //4 days
  await mineBlock(network.provider)
  
  tx = await minter.update_period();
  await tx.wait()

  console.log('claimable before updating period NEW NFT', await distributor.claimable(tokenId))
  t =  await distributor.last_week()
  console.log('epoch t is ', t)
  console.log('balance of nft ', await veRETRO.balanceOfNFT(tokenId))
  console.log('balance of nft at t ', await veRETRO.balanceOfNFTAt(tokenId, t))
  console.log('epoch t is ', await veRETRO.balanceOfNFT(tokenId))

  tx = await veRETRO.increase_unlock_time(tokenId,"60480000")
  await tx.wait()

  console.log('claimable after updating period NEW NFT', await distributor.claimable(tokenId))

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
