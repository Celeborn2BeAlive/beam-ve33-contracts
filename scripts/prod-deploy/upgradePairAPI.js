//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {

    accounts = await ethers.getSigners();
    owner = accounts[0]

    const veartContract = await ethers.getContractAt("Retro", "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175")
    console.log(await veartContract.balanceOf('0x35dCEaD4670161a3D123b007922d61378D3A9d18', {blockTag: 51644349}))
    console.log(await veartContract.balanceOf('0x35dCEaD4670161a3D123b007922d61378D3A9d18'))

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
