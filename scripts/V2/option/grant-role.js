const { ethers } = require("hardhat");
const { getOptionContract } = require(".");

const ROLE = "ADMIN"
const ADDRESS = "0xc8949dbaf261365083a4b46ab683BaE1C9273203";

async function main() {
  const optionTokenV2 = await getOptionContract();

  const grantRoleTx = await optionTokenV2.grantRole(ethers.utils.keccak256(ethers.utils.toUtf8Bytes(ROLE)), ADDRESS); 
  console.log(`grantRoleTx: ${grantRoleTx.hash}`);
}

main()