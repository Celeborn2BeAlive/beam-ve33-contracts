const { ethers } = require("hardhat");

const OPTION_ADDRESS = "0xbd9de110d1fb8ae7e47732c755a3cab4e43f321a";

async function getOptionContract() {
  const optionTokenV2 = await ethers.getContractAt("OptionTokenV2", OPTION_ADDRESS);
  return optionTokenV2;
}

module.exports = {
  getOptionContract,
};