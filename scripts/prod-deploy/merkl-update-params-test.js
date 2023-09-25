//const ether = require('@openzeppelin/test-helpers/src/ether');
const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {
    
    const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    const gauge = "0x16ab4d14eb7A998443Eda477EdaAb9202ae4957b"
    const gaugeFactory = "0x9AE721D3Bae22FA42AA11eD7E4AB0b9b7263DE52"

    const desiredParams = [ '0x0000000000000000000000000000000000000000000000000000000000000000',
    '0x13d5e61838D93F7962C52dc921FD7C0Ccc092E35',
    '0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F',
    0,
    [],
    [],
    6000,
    0,
    4000,
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
