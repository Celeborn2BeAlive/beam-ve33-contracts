//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = ""
const gauges = ["0x8ceD58A2dE3C2ea5D3cED3eb4331158c8cf985Fb"]

async function main () {

    const signer = ethers.provider.getSigner();
    
    voter = await ethers.getContractAt("VoterV3", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer);

    for(let gauge of gauges){
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
