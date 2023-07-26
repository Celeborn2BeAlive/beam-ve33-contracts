const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  // const OptionFeeDistributor = await ethers.getContractFactory("OptionFeeDistributor");
  // const UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
  const OptionTokenV2 = await ethers.getContractFactory("OptionTokenV2");

  const name = "Option to buy RETRO";
  const symbol = "oRETRO";
  const admin = deployer.address;
  const paymentToken = "0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270"; // WMATIC
  const underlyingToken = "0x519b31f22eb35ef086d19e90b2cbd9f1db1193ea"; // RETRO 0x85A2638E652d4265ca7567Dd2935464FF74740c2
  const gaugeFactory = "0x92ba53Fb2801cC1918916d62a6243eC47e278AFD";
  const votingEscrow = "0x83AA7C0074f128434d7c5Dc1AeC36266E36d484E"; // veRETRO
  // The discount given when exercising. 30 = user pays 30%
  const discount = 50;
  // The discount given when exercising for veRETRO. 30 = user pays 30%
  const veDiscount = 0;

  // Using WMATIC/USDC pool TWAP temporarily for testing
  // TODO: change this to the RETRO/<paymentToken> pool

    const [factory, token0, token1, fee] = [
      "0x1f98431c8ad98523631ae4a59f267346ea31f984",
      "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270",
      "0x3a58a54c066fdc0f2d55fc9c89f0415c92ebf3c4",
      100,
    ];
  // const uniswapV3Twap = await UniswapV3Twap.deploy(
  //   factory,
  //   token0,
  //   token1,
  //   fee
  // );

  // await uniswapV3Twap.deployed();

  // const feeDistributor = await OptionFeeDistributor.deploy();

  // await feeDistributor.deployed();

  const optionTokenV2 = await OptionTokenV2.deploy(
    name,
    symbol,
    admin,
    paymentToken,
    underlyingToken,
    uniswapV3Twap.address,
    gaugeFactory,
    feeDistributor.address,
    discount,
    veDiscount,
    votingEscrow
  );

  await optionTokenV2.deployed();
  
  console.log("UniswapV3Twap deployed to:", uniswapV3Twap.address);
  console.log("OptionTokenV2 deployed to:", optionTokenV2.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
