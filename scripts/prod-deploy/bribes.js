//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const tokenToBribe = "0x7c603c3c0c97a565cf202c94ab5298bf8510f7dc"
const gauges = ["0xfb0d002aBd1CBbEB33286caCdb0d468a588E1a4E","0xa3a2444dD03a8e6Ba210C3ccFb33c7bB6d1795cA","0x4CE02eE7feFcaF51db86b1284Ec78778CF8D0c22"]

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
