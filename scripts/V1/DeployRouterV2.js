const { ethers  } = require('hardhat');




async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contract...');

    const pairFactory = '0x4FF18329e8b0f8C12892bC6ab554f4F4198bEbB0'
    const wBNB = '0x4F9A0e7FD2Bf6067db6994CF12E4495Df938E6e9'

    data = await ethers.getContractFactory("RouterV2");
    router = await data.deploy(pairFactory, wBNB);

    txDeployed = await router.deployed();
    console.log("router: ", router.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
