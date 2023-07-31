const { getOptionContract } = require(".");

const newFeeDistributor = "";

async function main() {
  await uniswapV3Twap.deployed();

  const optionContract = await getOptionContract();

  if (!newFeeDistributor) {
    console.log("Please set the new fee distributor address");
    return;
  }

  // Update UniswapV3Twap address
  const tx = await optionContract.setFeeDistributor(
    uniswapV3Twap.address,
    newFeeDistributor
  );
}

main();
