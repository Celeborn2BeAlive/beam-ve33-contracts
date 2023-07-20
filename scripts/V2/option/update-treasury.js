import { ethers } from "hardhat";

const OPTION_ADDRESS = "0x981E895CBA9dA29927838A9feB699AB255999933"
const NEW_TREASURY = ""

async function main() {
  const optionTokenV2 = await ethers.getContractAt("OptionTokenV2", OPTION_ADDRESS);

  await optionTokenV2.setTreasury(NEW_TREASURY)
}

main()
