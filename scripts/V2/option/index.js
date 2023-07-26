const { ethers } = require("hardhat");

const OPTION_ADDRESS = "0x9945EE94083B8e2203e5Ebd5b5A80D2f374dCCF8";

async function getOptionContract() {
  const optionTokenV2 = await ethers.getContractAt("OptionTokenV2", OPTION_ADDRESS);
  return optionTokenV2;
}

module.exports = {
  getOptionContract,
};