import hre from "hardhat";
import { checkIsUndeployed } from "./deploys";



async function main () {
    checkIsUndeployed("EMISSION_TOKEN_ADDRESS")

    console.log('Deploying Contract...');

    const name = "EmissionToken";
    const symbol = "ET";

    const emissionToken = await hre.viem.deployContract("EmissionToken", [name, symbol]);
    console.log("Deployed at: ", emissionToken.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
