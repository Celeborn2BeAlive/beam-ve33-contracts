const { ethers } = require("hardhat");
const { getOptionContract } = require(".");

const newTwap = ""
const newPaymentToken = "";

async function main() {
  await uniswapV3Twap.deployed();

  const optionContract = await getOptionContract();

  // Update UniswapV3Twap address
  const tx = await optionContract.setTwapOracleAndPaymentToken(
    uniswapV3Twap.address,
    newPaymentToken
  );
}

main();
