//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const pools = []

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    console.log('Deploying Contracts... Owner is: ' + owner.address);
    
    feeHandler = await ethers.getContractAt("ProtocolFeeHandler", "0x5A39D3fF53844a148d0040738F5D57c7eC0398db");
    voter = await ethers.getContractAt("VoterV3", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73");

    for(let pool of pools){
        tx = await voter.createGauge(pool, 1);
        await tx.wait();
        console.log('deployed gauge for pool ' + pool);
        tx = await feeHandler.changeProtocolFees(pool, 13, 13);
        await tx.wait()
        console.log('changed fees for pool ' + pool);
    }
   
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
