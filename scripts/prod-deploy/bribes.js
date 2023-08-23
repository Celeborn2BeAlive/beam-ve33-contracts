//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0x86b634eac93e463fcc303e632ddf05cfaadfdad1"
const gauges = ["0x4A7B85b9B0FE3801Ca666ce9f1EDDCD8c33e5eE5","0xA495A2399432a3698C74f5c48C534833056ed937","0xDAe249C5446a794be6DFD80094F09ab8405Dca97"]

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
