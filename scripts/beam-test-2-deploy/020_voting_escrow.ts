import hre from "hardhat";
import { checkIsDeployed, ZERO_ADDRESS } from "./deploys";
import { Address } from "viem";

// Depends on:
// - 010_token.ts

async function main () {
    const EMISSION_TOKEN_ADDRESS = checkIsDeployed("EMISSION_TOKEN_ADDRESS");

    const emissionToken = await hre.viem.getContractAt("EmissionToken", EMISSION_TOKEN_ADDRESS);
    const veArtProxyAddress = ZERO_ADDRESS;
    /** Should be:
    const veArtProxy = await hre.viem.getContractAt("VeArtProxyUpgradeable", VEARTPROXY_ADDRESS);
    veArtProxyAddress = veArtProxy.address;
    But can be deployed later.
    */

    const constructorArguments: [Address, Address] = [emissionToken.address, veArtProxyAddress,]
    const veToken = await hre.viem.deployContract("VotingEscrow", constructorArguments);
    console.log("Deployed at: ", veToken.address);

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
