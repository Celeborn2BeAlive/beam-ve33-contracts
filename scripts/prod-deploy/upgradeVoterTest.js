//const ether = require('@openzeppelin/test-helpers/src/ether');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

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

async function main () {
    const provider = waffle.provider
    const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    const impersonateTeam = await ethers.getImpersonatedSigner("0x35dCEaD4670161a3D123b007922d61378D3A9d18");
    const proxyAdmin = "0xcF3A3f7C77c2573829A973559352495BA89eA7E2"
    const proxy = "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73"
    const newImpl = "0x71F6CAc5C79A9AF50f47Df0568c075A6055ba830"
    
    await impersonateMyself.sendTransaction({
        to: impersonateTeam.address,
        value: ethers.utils.parseEther("50"),
        });

    // const veartContract = await ethers.getContractFactory("VoterV3", impersonateMyself)
    // addressNewImpl = await upgrades.prepareUpgrade(proxy, veartContract);
    // console.log('VoterV3 prepared for upgrade', addressNewImpl);

    const proxyAdminContract = await ethers.getContractAt([{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"},{"internalType":"address","name":"newAdmin","type":"address"}],"name":"changeProxyAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"}],"name":"getProxyAdmin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"}],"name":"getProxyImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"},{"internalType":"address","name":"implementation","type":"address"}],"name":"upgrade","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"},{"internalType":"address","name":"implementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeAndCall","outputs":[],"stateMutability":"payable","type":"function"}], proxyAdmin, impersonateTeam);

    const apiContract = await ethers.getContractAt("VoterV3", proxy, impersonateMyself);

    console.log(await apiContract.totalWeight())
    console.log(await apiContract._epochTimestamp())
    console.log(await apiContract._ve())
    //console.log(await apiContract.getPair(testPool, impersonateMyself.address))
    //const veartContract = await ethers.getContractFactory("PairAPI")
    tx = await proxyAdminContract.upgrade(proxy, newImpl);
    await tx.wait()
    console.log('VoterV3 upgraded');
    console.log(await apiContract.totalWeight())
    console.log(await apiContract._epochTimestamp())
    console.log(await apiContract._ve())


    // tx = await apiContract.vote(9940, ["0x72DA5f09939Fb8B7903122D9CCAa7bdbeEd41996"], [100])
    // await tx.wait()

    // console.log('voted first')

    // tx = await apiContract.vote(9940, ["0x72DA5f09939Fb8B7903122D9CCAa7bdbeEd41996"], [100])
    // await tx.wait()
    // console.log('voted second')


    // await increaseTime(provider, 79200) //22 hours
    // await mineBlock(provider)

    // await increaseTime(provider, 79200) //22 hours
    // await mineBlock(provider)

    // tx = await apiContract.distributeAll();
    // await tx.wait()

    // console.log('new epoch')


    // tx = await apiContract.vote(9940, ["0x72DA5f09939Fb8B7903122D9CCAa7bdbeEd41996"], [100])
    // await tx.wait()
    // console.log('voted first')

    // tx = await apiContract.vote(9940, ["0x72DA5f09939Fb8B7903122D9CCAa7bdbeEd41996"], [100])
    // await tx.wait()

    // console.log('voted second')

    //console.log(await apiContract.getPair(testPool, impersonateMyself.address))



}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
