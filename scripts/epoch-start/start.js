//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle")


function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

let gauges = ["0xeaEDdC8719a7e95F6353f52782A254FBf7BAFB3D"]


//chain
async function main () {

    const signer = ethers.provider.getSigner();

    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)

    // tx = await voter.distributeAll();
    // await tx.wait();
    // await sleep(2500)
    
    while (gauges.length > 0) {

      gauge = gauges.splice(0,1)

        try{
            // await voter['distribute(address)'](gauge)
            tx = await voter.estimateGas.distribute(gauge)
            console.log(tx)
            if(tx.gt(0)){
                tx = await voter.distribute(gauge)
                await tx.wait()
                await sleep(2500)
                console.log('distributed for', gauge)
            }else{
                console.log('gas failed for', gauge)
            }
        }catch(err){
            console.log('failed for', gauge)
            continue;
        }
        console.log('done')
        
    }

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
