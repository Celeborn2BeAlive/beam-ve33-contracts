//const ether = require('@openzeppelin/test-helpers/src/ether');
const { setNextBlockBaseFeePerGas } = require('@nomicfoundation/hardhat-network-helpers');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

function sleep(ms) {
    return new Promise((resolve) => {
      setTimeout(resolve, ms);
    });
  }


let gauges = ["0x3e75c52fBbEF086dF5849dFB57094eDA000F11aa"]
const total = 10000
const levels = {
  1:8500,
  2:500
}

async function main () {

    const impersonateMyself = ethers.provider.getSigner();
    
    const gaugeFactory = "0x9AE721D3Bae22FA42AA11eD7E4AB0b9b7263DE52"
    const gaugeFactoryContract = await ethers.getContractAt("GaugeFactoryV2_CL", gaugeFactory, impersonateMyself)
    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", impersonateMyself)

    while (gauges.length > 0) {

        gauge = gauges.splice(0,1)[0]
        console.log('checking', gauge)
  
          try{

            const univ3Pool = await voter.poolForGauge(gauge);

            const desiredParams = [ '0x0000000000000000000000000000000000000000000000000000000000000000',
            univ3Pool,
            '0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F',
            0,
            [],
            [],
            levels[1],
            levels[2],
            total - levels[1] - levels[2],
            0,
            168,
            0,
            25000,
            '0xB419cE2ea99f356BaE0caC47282B9409E38200fa',
            '0x' ]

            const gaugeContract = await ethers.getContractAt("GaugeV2_CL", gauge, impersonateMyself)
            const params = await gaugeContract.gaugeParams();
        
            if(params[4] == levels[1] && params[5] == levels[2] && params[6] == total - levels[1] - levels[2]){
                console.log('skipping for', gauge);
                continue;
            }
        
            tx = await gaugeFactoryContract.setMerklParamsFor(gauge, desiredParams)
            await tx.wait()
            await sleep(2500)
        
            const paramsNew = await gaugeContract.gaugeParams();
        
            console.log('new merkl params: ', paramsNew, gauge)
            

          }catch(err){
              console.log('failed for', gauge, err)
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
