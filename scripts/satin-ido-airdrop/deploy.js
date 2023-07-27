const { ethers } = require("hardhat");

const votingEscrow = "0xB419cE2ea99f356BaE0caC47282B9409E38200fa";
const underlyingToken = "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb";

async function main() {
  const VeAirdrop = await ethers.getContractFactory("VeAirdrop");
  const veAirdrop = await VeAirdrop.deploy(
    votingEscrow,
    underlyingToken,
  )
  await veAirdrop.deployed();
  console.log("VeAirdrop deployed to:", veAirdrop.address);
}

main()