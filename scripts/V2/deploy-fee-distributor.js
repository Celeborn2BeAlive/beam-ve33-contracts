const { ethers } = require("hardhat");

async function main() {
  const OptionFeeDistributor = await ethers.getContractFactory("OptionFeeDistributor");
  const optionFeeDistributor = await OptionFeeDistributor.deploy();

  await optionFeeDistributor.deployed();

  console.log("OptionFeeDistributor deployed to:", optionFeeDistributor.address);
}

main();
