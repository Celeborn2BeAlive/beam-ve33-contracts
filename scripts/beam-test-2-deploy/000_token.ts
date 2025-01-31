import hre from "hardhat";
import { checkIsUndeployed } from "./deploys";



async function main () {
    checkIsUndeployed("EMISSION_TOKEN_ADDRESS")

    console.log('Deploying Contract...');

    const name = "EmissionToken";
    const symbol = "ET";

    const constructorArguments: [string, string] = [name, symbol];
    const emissionToken = await hre.viem.deployContract("EmissionToken", constructorArguments);
    console.log("Deployed at: ", emissionToken.address)

    // console.log('Verifying Contract...');
    // await hre.run("verify:verify", {
    //   address: emissionToken.address,
    //   constructorArguments
    // });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
