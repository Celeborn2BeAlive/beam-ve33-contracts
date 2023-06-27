const { ethers  } = require('hardhat');




async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contract...');
    
    const ve = '0x83AA7C0074f128434d7c5Dc1AeC36266E36d484E'
    const voter =	'0x8388556C586F08DDdd9e4b113b4A4c9360746C48'
    const rewDistro = '0xcbbfb57f8B32100DeDF08eD2D4a481c35d8EceaE'

    data = await ethers.getContractFactory("MinterUpgradeable");
    input = [voter, ve, rewDistro]
    minter = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    console.log("Minter: ", minter.address)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
