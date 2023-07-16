const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
  const OptionTokenV2 = await ethers.getContractFactory("OptionTokenV2");

  const name = "Option to buy RETRO";
  const symbol = "oRETRO";
  const admin = deployer.address;
  const paymentToken = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // WMATIC
  const underlyingToken = "0x85A2638E652d4265ca7567Dd2935464FF74740c2"; // RETRO
  const gaugeFactory = "0x92ba53Fb2801cC1918916d62a6243eC47e278AFD";
  // TODO: change this to the treasury address
  const treasury = deployer.address;
  const votingEscrow = "0x83AA7C0074f128434d7c5Dc1AeC36266E36d484E"; // veRETRO
  // The discount given when exercising. 30 = user pays 30%
  const discount = 30;
  // The discount given when exercising for veRETRO. 30 = user pays 30%
  const veDiscount = 100;

  // Using WMATIC/USDC pool TWAP temporarily for testing
  // TODO: change this to the RETRO/<paymentToken> pool
  const factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
  const token0 = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
  const token1 = "0x2791bca1f2de4661ed88a30c99a7a9449aa84174";
  const fee = 500;

  const uniswapV3Twap = await UniswapV3Twap.deploy(
    factory,
    token0,
    token1,
    fee
  );

  await uniswapV3Twap.deployed();

  const optionTokenV2 = await OptionTokenV2.deploy(
    name,
    symbol,
    admin,
    paymentToken,
    underlyingToken,
    uniswapV3Twap.address,
    gaugeFactory,
    treasury,
    discount,
    veDiscount,
    votingEscrow
  );

  await optionTokenV2.deployed();

  console.log("UniswapV3Twap deployed to:", uniswapV3Twap.address);
  console.log("OptionTokenV2 deployed to:", optionTokenV2.address);

  const twap = await optionTokenV2.getTimeWeightedAveragePrice(
    "1000000000000000000"
  );

  const discountedPrice = await optionTokenV2.getDiscountedPrice(
    "1000000000000000000"
  );

  console.log("TWAP:", twap.toString());
  console.log("Discounted price:", discountedPrice.toString());
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
