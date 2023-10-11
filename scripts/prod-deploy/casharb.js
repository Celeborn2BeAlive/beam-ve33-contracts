//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle");

async function send(provider, method, params = []) {
    await provider.send(method, params)
}

async function mineBlock(provider) {
    await send(provider, "evm_mine")
}
  
async function increaseTime(provider, seconds) {
    await send(provider, "evm_increaseTime", [seconds])
}

async function main () {

  const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
  const impersonateTeam = await ethers.getImpersonatedSigner("0x35dCEaD4670161a3D123b007922d61378D3A9d18");
  const timelock = await ethers.getContractAt("StablTimelock","0x99ecCeB96171F30838389684871A467B21613860",impersonateTeam)
  
  const cashArbAddress = "0x56B7Ed062B89201AB44323208D858b98D918041d"

  await impersonateMyself.sendTransaction({
      to: impersonateTeam.address,
      value: ethers.utils.parseEther("50"),
      });

    tx = await timelock.signalSetFeeExempt(cashArbAddress, true)
    await tx.wait()

    await increaseTime(provider, 86400) //1 day
    await mineBlock(provider)

    tx = await timelock.setFeeExempt(cashArbAddress, true)
    await tx.wait()

    cashArb = await ethers.getContractAt("ArbBurn", cashArbAddress,impersonateMyself);
    
    tx = await cashArb.work("10000000000"); //10k
    await tx.wait()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
