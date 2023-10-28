//const ether = require('@openzeppelin/test-helpers/src/ether');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {
    
    const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    const gauge = "0x4A7B85b9B0FE3801Ca666ce9f1EDDCD8c33e5eE5"
    const gaugeFactory = "0x9AE721D3Bae22FA42AA11eD7E4AB0b9b7263DE52"

    const desiredParams = [ '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0xCE67850420c82dB45eb7fEeCcD2d181300D2BDB3',
    '0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F',
    0,
    [],
    [],
    100,
    100,
    9800,
    0,
    168,
    0,
    25000,
    '0xB419cE2ea99f356BaE0caC47282B9409E38200fa',
    '0x' ]
        
    const gaugeContract = await ethers.getContractAt("GaugeV2_CL", gauge, impersonateMyself)
    const params = await gaugeContract.gaugeParams();

    console.log('current merkl params: ', params)

    const gaugeFactoryContract = await ethers.getContractAt("GaugeFactoryV2_CL", gaugeFactory, impersonateMyself)
    tx = await gaugeFactoryContract.setMerklParamsFor(gauge, desiredParams)
    await tx.wait()

    const paramsNew = await gaugeContract.gaugeParams();

    console.log('current merkl params: ', paramsNew)


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
