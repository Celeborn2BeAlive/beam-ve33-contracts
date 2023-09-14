//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0x0294d8eb7857d43feb1210db72456d41481f9ede"
const gauges = ["0xca6c3f9833091493F818b299a1fFC8E4E68511b1"]

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
