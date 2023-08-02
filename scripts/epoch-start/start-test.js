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

const gauges = ["0x6315d75055c217E03916d726Dcc768B610d3FF50","0x5b5433F62C198C9E15c1cAA1d72b8a6Bf292f370","0x4A7B85b9B0FE3801Ca666ce9f1EDDCD8c33e5eE5","0xA495A2399432a3698C74f5c48C534833056ed937","0x5912e79dCf96D1b31702cdCE1262e64F99782F36","0x9889c60926Af4565adD6C22eab04aCCCCf65779b","0x3a87D89280Fb00676B7a5ddd639A6C2F32DF935e","0xD9AF4c9a7E7C472FaD93132E0952b0DcFFBcA7F1","0xd8d9CFaFefb78c9b2ffF81805beF180C5823D949","0x273f8Fe9516458986d8710264a529a0a4a1517d4","0x10eF8C5C88811e881ba60140cCC8D5eEc6a26cF8","0xCc66188C25491a9e74Dd98152d27CEF91A078341","0xf08392D40DFe775792085d602351d7DEFe4C0727","0xb891e98E549B9a350D818ba4067Ccd1C6719Dd6B","0xeDf2b72BdAa81f5D0678861E0d0bF6cfBe4e292E","0x8e68e4Cc432F6b96EE1DFFDed684c6eb465CE6A0","0xa9706dB53a25c004Ff95201eEFbE454434321703","0xDAe249C5446a794be6DFD80094F09ab8405Dca97","0x0C4B24E02acCDE3Ddd5beFa5B12de9846B4Ab3BE","0x5Ce4a22cF7aBd895D7839B76673fde87D2AE0500","0x028D384EE39c10eAEDDb8C6c8dc230215742e666","0x2198713815e3356d59F5c58Be2d78615C3fEfe5C","0x907d90497cE9EbE2611155715Fb922152496e26a","0xD6882f616Cb7AC77a0dc7Ede60D337F21DaB2648","0x8EF6b9bB782928D5502836493c6759390D6367a3","0xCb3056D55A99ee68D7D2F82d96829191D063beeF","0xD5f9EA9E1536967E7a4F028FC7Ceeaa6db58372c","0x05b5136232c82E0EeAFD835947d6Dc2c087aAC1a","0xDA37C098512550C159BA637385CE418E2A40fb0b","0x4ffb56016E0Ac939A5043e6Ee8B929c4561FC7aa","0x26AF94E108928364B11815608831f504c72CFbeF","0x68410687BFD125664F6a46F4914268E9efBE5253","0x2b75Cf3C8476C3E1EaaBd5A050948771A8D315e4","0xb6E87079B0134200Aab4d04C180F287f15160FCD","0xCD71C22C015baB634c741e305f13B8b5D3Ee1bed","0x82CFf2990EDa94DC80F2515e1C365c3a32ee3ce7","0x3e75c52fBbEF086dF5849dFB57094eDA000F11aa","0x5AFeBf41853dDB46F22eF6f69DF981A1eBbEDb57","0x347e345c5fDd4575fB3DB85380FCffAD64f3c601","0xbD1Daa1084Ee12afa09AD4344e077AA4c2836536","0x903cdd4f4490D27414A24FDB7D3020170F89e244","0x16ab4d14eb7A998443Eda477EdaAb9202ae4957b","0x20Ee1b3d2Aec2B8edE2386bFD1514e51A5580f90","0x46868F00e16f35363a0e9E3758B2Ee38e148674A","0x4018068ABf3758747DA89F82a690FDC46917e0F4","0xf1fBA6df5f085a3711247E61f83B56413c3CCf64","0x29b4a1a2DD7B6214c957c896c088CF35c4A9F173","0xe2702216Aae358Ee73C86B2f60E07601b0218174","0x89D55Ce34a9DCF98DE38A5fbaeEdD0279FB0Ef46"]

//chain
async function main () {

    var addressToImpersonate = "0xc8949dbaf261365083a4b46ab683BaE1C9273203" //deployer

    var signer = await ethers.getImpersonatedSigner(addressToImpersonate);

    const provider = waffle.provider

    await increaseTime(provider, 86400) //1 day
    await mineBlock(provider)

    const voter = await ethers.getContractAt("VoterV3NoOverloadingFunction", "0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", signer)

    for(let gauge of gauges){
        try{
            // await voter['distribute(address)'](gauge)
            tx = await voter.estimateGas.distribute([gauge])
            console.log(tx)
                if(tx.gt(0)){
                    tx = await voter.distribute([gauge])
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

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
