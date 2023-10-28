//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0x1a3acf6d19267e2d3e7f898f42803e90c9219062"
let gauges = ["0x3570FdEA187Cf23f6cDA4632229e06A5514519Bd"]
let bribes = [];
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
            bribes.push(bribe);
            await sleep(1000)
            console.log('added bribe for', gauge.address)
            /*tx = await bribeFactory.addRewardToBribe(tokenToBribe, bribe);
            await tx.wait();
            await sleep(2500)
            console.log('done for', gauge.address)*/
        }catch(err){
            console.log(err)
            continue;
        }
    }
    tx = await bribeFactory.addRewardToBribes(tokenToBribe, bribes);
    await tx.wait()
    await sleep(2500)
    console.log('done');
   
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
