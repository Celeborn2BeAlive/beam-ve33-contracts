const { ethers } = require("hardhat");

async function main() {
  const [deployer] = await ethers.getSigners();

  const OptionFeeDistributor = await ethers.getContractFactory("OptionFeeDistributor");
  const UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
  const OptionTokenV2 = await ethers.getContractFactory("OptionTokenV2");

  const name = "Option to buy RETRO";
  const symbol = "oRETRO";
  const admin = deployer.address;
  const paymentToken = "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175"; // CASH
  const underlyingToken = "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb"; // RETRO 0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb
  
  const gaugeFactory = "0xA7315EB57b3C9EA0B279B770DFf0f10F3AEEaa8D";
  const gaugeFactoryCL = "0xB428a795495527FEe790c9811EcF4f8baE437F65";
  
  const votingEscrow = "0x3B7B7Fb00c3E5726831E91E45441a013C65980D9"; // veRETRO
  // The discount given when exercising. 30 = user pays 30%
  const discount = 50;
  // The discount given when exercising for veRETRO. 30 = user pays 30%
  const veDiscount = 0;


  const factory = "0x91e1b99072f238352f59e58de875691e20dc19c1";
  // Using WMATIC/USDC pool TWAP temporarily for testing
  // TODO: change this to the RETRO/<paymentToken> pool

  const uniswapV3Twap = await UniswapV3Twap.deploy(
   factory,
    paymentToken,
    underlyingToken,
    3000
   );

  await uniswapV3Twap.deployed();

  const feeDistributor = await OptionFeeDistributor.deploy();

  await feeDistributor.deployed();

  const optionTokenV2 = await OptionTokenV2.deploy(
    name,
    symbol,
    admin,
    paymentToken,
    underlyingToken,
    uniswapV3Twap.address,
    feeDistributor.address,
    discount,
    veDiscount,
    votingEscrow
  );

  await optionTokenV2.deployed();

  const tx = await optionTokenV2.addGaugeFactory(gaugeFactory);
  await tx.wait();

  const tx2 = await optionTokenV2.addGaugeFactory(gaugeFactoryCL);
  await tx2.wait();
  
  console.log("UniswapV3Twap deployed to:", uniswapV3Twap.address);
  console.log("OptionTokenV2 deployed to:", optionTokenV2.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
