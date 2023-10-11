//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

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
  
  const CashArb = await ethers.getContractFactory("ArbBurn", impersonateMyself)
  let cashArb = await CashArb.deploy(
    "0x619259f699839dd1498ffc22297044462483bd27",
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174",
    "0x5d066d022ede10efa2717ed3d79f22f949f8c175",
    "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063",
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f",
    "0x1891783cb3497Fdad1F25C933225243c2c7c4102",
    "0xe592427a0aece92de3edee1f18e0157c05861564",
    "0xA0BCD74a2021F82BB1Ba42E7Da867Be28D37C831",
    "0x0000000000000000000000000000000000000000",
    "0x0000000000000000000000000000000000000000"
  )
  // await cashArb.waitForDeployment() // Use this for hardhat-tools >= 3.0.0 https://ethereum.stackexchange.com/questions/151236/fixed-hardhat-deploy-error
  // let cashArbAddress = await cashArb.getAddress() // Use this for hardhat-tools >= 3.0.0
  await cashArb.deployed()
  let cashArbAddress = cashArb.address

  await impersonateMyself.sendTransaction({
      to: impersonateTeam.address,
      value: ethers.utils.parseEther("50"),
      });

    tx = await timelock.signalSetFeeExempt(cashArbAddress, true)
    await tx.wait()

    await time.increase(86400)

    tx = await timelock.setFeeExempt(cashArbAddress, true)
    await tx.wait()

    
    tx = await cashArb.work("10000000000"); //10k
    await tx.wait()

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
