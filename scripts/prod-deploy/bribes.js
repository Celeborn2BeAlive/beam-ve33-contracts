//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0xf972daced7c6b03223710c11413036d17eb298f6"
let gauges = ["0x1bFdf03A56b5420fd3ce64185862CAC6AeC03244"]

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }

async function main () {

    const signer = ethers.provider.getSigner();
    
    bribeFactory = await ethers.getContractAt("BribeFactoryV3", "0x601b14aCb5C340f2a12Ee9D3BE0B0828E5619081", signer);

    for(let gauge of gauges){
        try{
            gauge = await ethers.getContractAt("GaugeV2_CL",gauge ,signer)
            const bribe = await gauge.external_bribe();
            tx = await bribeFactory.addRewardToBribe(tokenToBribe, bribe);
            await tx.wait();
            await sleep(2500)
            console.log('done for', gauge.address)
        }catch(err){
            console.log(err)
            continue;
        }
    }
   
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
