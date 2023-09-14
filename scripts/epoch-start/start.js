//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle")


function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

let gauges = ["0xf08392D40DFe775792085d602351d7DEFe4C0727","0x2b75Cf3C8476C3E1EaaBd5A050948771A8D315e4","0x82CFf2990EDa94DC80F2515e1C365c3a32ee3ce7","0xf1fBA6df5f085a3711247E61f83B56413c3CCf64"]


//chain
async function main () {

    const signer = ethers.provider.getSigner();

    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)

    // tx = await voter.distributeAll();
    // await tx.wait();
    // await sleep(2500)
    
    while (gauges.length > 0) {

      gauge = gauges.splice(0,5)

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
