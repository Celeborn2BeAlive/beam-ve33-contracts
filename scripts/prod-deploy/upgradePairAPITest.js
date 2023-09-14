//const ether = require('@openzeppelin/test-helpers/src/ether');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {
    
    const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    const impersonateTeam = await ethers.getImpersonatedSigner("0x35dCEaD4670161a3D123b007922d61378D3A9d18");
    const proxyAdmin = "0xcF3A3f7C77c2573829A973559352495BA89eA7E2"
    const proxy = "0xDF5ed9869721A37981359fA5a617D53Ef1B7e8b5"

    const testPool = "0x1a34EaBbe928Bf431B679959379b2225d60D9cdA";
    
    await impersonateMyself.sendTransaction({
        to: impersonateTeam.address,
        value: ethers.utils.parseEther("50"),
        });

    const veartContract = await ethers.getContractFactory("PairAPI", impersonateMyself)
    addressNewImpl = await upgrades.prepareUpgrade(proxy, veartContract);
    console.log('PairAPIProxy upgraded', addressNewImpl);

    const proxyAdminContract = await ethers.getContractAt([{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"previousOwner","type":"address"},{"indexed":true,"internalType":"address","name":"newOwner","type":"address"}],"name":"OwnershipTransferred","type":"event"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"},{"internalType":"address","name":"newAdmin","type":"address"}],"name":"changeProxyAdmin","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"}],"name":"getProxyAdmin","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"}],"name":"getProxyImplementation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"renounceOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newOwner","type":"address"}],"name":"transferOwnership","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"},{"internalType":"address","name":"implementation","type":"address"}],"name":"upgrade","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"contract TransparentUpgradeableProxy","name":"proxy","type":"address"},{"internalType":"address","name":"implementation","type":"address"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"upgradeAndCall","outputs":[],"stateMutability":"payable","type":"function"}], proxyAdmin, impersonateTeam);

    const apiContract = await ethers.getContractAt("PairAPI", proxy);

    //console.log(await apiContract.getPair(testPool, impersonateMyself.address))
    //const veartContract = await ethers.getContractFactory("PairAPI")
    tx = await proxyAdminContract.upgrade(proxy, addressNewImpl);
    await tx.wait()
    console.log('PairAPIProxy upgraded');
    console.log(await apiContract.getPair(testPool, impersonateMyself.address))

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
