//const ether = require('@openzeppelin/test-helpers/src/ether');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

const pools = ["0x6333BB8b6f1DDa6f929d70eDEB9e31c8148dC9ef","0xCC72276de3BCc1b159F1B60A86B0211116022B42"]

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function main () {
    //const signer = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    const signer = ethers.provider.getSigner();
    
    feeHandler = await ethers.getContractAt("ProtocolFeeHandler", "0x5A39D3fF53844a148d0040738F5D57c7eC0398db", signer);
    voter = await ethers.getContractAt("VoterV3", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer);
    gaugeFactoryV2CL = await ethers.getContractAt("GaugeFactoryV2_CL", "0x9AE721D3Bae22FA42AA11eD7E4AB0b9b7263DE52", signer);
    
    for(let pool of pools){
        tx = await voter.createGauge(pool, 1); //CL
        await tx.wait();
        console.log('deployed gauge for pool ' + pool);
        console.log('gauge address: ' + await voter.gauges(pool))
        await sleep(2500);
        tx = await feeHandler.changeProtocolFees(pool, 13, 13);
        await tx.wait()
        console.log('changed fees for pool ' + pool);
        await sleep(2500);
        feeVaultAddress = await gaugeFactoryV2CL.last_feeVault()
        feeVault = await ethers.getContractAt("CLFeesVault", feeVaultAddress, signer);
        tx = await feeVault.setGammaShare(1000);
        await tx.wait();
        await sleep(2500);
        console.log('done');
    }
   
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
