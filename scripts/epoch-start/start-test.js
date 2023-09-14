//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle")

async function send(provider, method, params = []) {
    await provider.send(method, params)
}

async function mineBlock(provider) {
    await send(provider, "evm_mine")
}
  
async function increaseTime(provider, seconds) {
    await send(provider, "evm_increaseTime", [seconds])
}

let gauges = ["0xf08392D40DFe775792085d602351d7DEFe4C0727","0x2b75Cf3C8476C3E1EaaBd5A050948771A8D315e4","0x82CFf2990EDa94DC80F2515e1C365c3a32ee3ce7","0xf1fBA6df5f085a3711247E61f83B56413c3CCf64"]

//chain
async function main () {

    var addressToImpersonate = "0xc8949dbaf261365083a4b46ab683BaE1C9273203" //deployer

    var signer = await ethers.getImpersonatedSigner(addressToImpersonate);

    const provider = waffle.provider

    // await increaseTime(provider, 86400) //1 day
    // await mineBlock(provider)

    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)

    while (gauges.length > 0) {

        gauge = gauges.splice(0,1)

        try{
            // await voter['distribute(address)'](gauge)
            tx = await voter.estimateGas.distribute(gauge)
            console.log(tx)
                if(tx.gt(0)){
                    tx = await voter.distribute(gauge)
                    await tx.wait()
                    console.log('distributed for', gauge)
                }else{
                    console.log('gas failed for', gauge)
                }
            console.log('done')
        }catch(err){
            console.log('error', err)
            continue;
        }
    }
    tx = await voter.setVoteDelay(0)
    await tx.wait()
    console.log('set vote delay to 0')

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
