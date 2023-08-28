//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");

//chain
const cash = {"address": "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175"}
let whitelisted_tokens = ["0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270","0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619","0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174","0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6","0xc2132D05D31c914a87C6611C10748AEb04B58e8F","0x5D066D022EDE10eFa2717eD3D79f22F949F8C175","0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063","0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89","0xa3Fa99A148fA48D14Ed51d610c367C61876997F1","0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4","0xbC2b48BC930Ddc4E5cFb2e87a45c379Aab3aac5C","0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6","0xEe327F889d5947c1dc1934Bb208a1E792F953E96","0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4","0xFbdd194376de19a88118e84E279b977f165d01b8","0x4028cba3965e8Aea7320e9eA50914861A14dc724","0x6749441Fdc8650b5b5a854ed255C82EF361f1596","0x434e7BBBc9ae9F4fFade0B3175FEf6e8A4A1C505"]
const feeLevel = 10000;

//PAIRFACTORY CLASSIC
const pairFactory = {"address": "0x1fC46294195aA87F77fAE299A14Bd1728dC1Cca9"}

//UNISWAPV3
const univ3_factory = {"address": "0x91e1B99072f238352f59e58de875691e20Dc19c1"};

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    data = await ethers.getContractFactory("DistributeFees");
    input = ["0xAcCbA5e852AB85E5E3a84bc8E36795bD8cEC5C73", 20]
    DistributeFees = await upgrades.deployProxy(data, input, {initializer: 'initialize'});
    txDeployed = await DistributeFees.deployed();
    console.log("DistributeFees: ", DistributeFees.address)

}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
