const { ethers } = require("hardhat");
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");

async function main() {
  const OptionsTokenV2 = await ethers.getContractFactory("OptionsTokenV2");

  const name = "Option to buy RETRO";
  const symbol = "oRETRO";

  const admin = ZERO_ADDRESS;
  const paymentToken = ZERO_ADDRESS;
  const underlyingToken = ZERO_ADDRESS;
  const twapOracle = ZERO_ADDRESS;
  const gaugeFactory = ZERO_ADDRESS;
  const treasury = ZERO_ADDRESS;
  const votingEscrow = ZERO_ADDRESS;

  // The discount given when exercising. 30 = user pays 30%
  const discount = 30;

  // The discount given when exercising for veRETRO. 30 = user pays 30%
  const veDiscount = 100;

  const optionsTokenV2 = await OptionsTokenV2.deploy(
    name,
    symbol,
    admin,
    paymentToken,
    underlyingToken,
    twapOracle,
    gaugeFactory,
    treasury,
    discount,
    veDiscount,
    votingEscrow
  );

  await optionsTokenV2.deployed();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
