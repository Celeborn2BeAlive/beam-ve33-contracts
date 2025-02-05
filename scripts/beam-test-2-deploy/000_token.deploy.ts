import hre from "hardhat";
import { checkIsUndeployed } from "./deploys";
import constructorArguments from "./000_token.constructorArgs"


async function main () {
    checkIsUndeployed("EMISSION_TOKEN_ADDRESS")

    console.log('Deploying Contract...');
    const emissionToken = await hre.viem.deployContract("contracts/EmissionToken.sol:EmissionToken", constructorArguments);
    console.log("Deployed at: ", emissionToken.address)
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
