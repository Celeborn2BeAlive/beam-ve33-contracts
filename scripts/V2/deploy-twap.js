const { ethers } = require("hardhat");

const factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
const token0 = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
const token1 = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
const fee = 500;

async function main() {
  const UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
  const uniswapV3Twap = await UniswapV3Twap.deploy(
    factory,
    token0,
    token1,
    fee
  );

  await uniswapV3Twap.deployed();

  console.log("UniswapV3Twap deployed to:", uniswapV3Twap.address);
}

main();
