const { ethers  } = require('hardhat');




async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contract...');

    const pairFactory = '0x1fC46294195aA87F77fAE299A14Bd1728dC1Cca9'
    const wBNB = '0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270'

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
