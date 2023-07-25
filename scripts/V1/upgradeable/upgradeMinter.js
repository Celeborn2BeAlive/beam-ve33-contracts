const { ethers  } = require('hardhat');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]
    console.log('Upgrading Contract...');
    const data = await ethers.getContractFactory('MinterUpgradeable');
    console.log('Minter...');
    await upgrades.upgradeProxy('0xaa25d99d03FECa8802172322538b78F36cbbAE23', data);
    console.log('Upgraded')
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
