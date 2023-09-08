//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0xb092e1bf50f518b3ebf7ed26a40015183ae36ac2"
const gauges = ["0x72DA5f09939Fb8B7903122D9CCAa7bdbeEd41996"]

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
