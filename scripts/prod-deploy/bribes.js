//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0xcaaf554900e33ae5dbc66ae9f8adc3049b7d31db"
let gauges = ["0x47A9cdDC86f93d378203B8EEa932339B09614f38","0x50c1178ED3eA8710f5346D96c46208DCe4D75575","0x6575A82f2BaFA63a395de8ca4497e1138e0A0A00","0x7806e788403f9d9762246d6A4aFde63daC42234a"]
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
