const { ethers } = require("hardhat");

const OPTION_ADDRESS = "0xBE0Be083cBBF61279C774D6145Bdc93609c33F64";

async function getOptionContract() {
  const optionTokenV2 = await ethers.getContractAt("OptionTokenV2", OPTION_ADDRESS);
  return optionTokenV2;
}

module.exports = {
  getOptionContract,
};