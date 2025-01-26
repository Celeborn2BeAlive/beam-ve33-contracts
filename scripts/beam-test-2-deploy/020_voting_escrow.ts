import hre from "hardhat";
import { checkIsDeployed, ZERO_ADDRESS } from "./deploys";

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

    const veToken = await hre.viem.deployContract("VotingEscrow", [emissionToken.address, veArtProxyAddress,]);
    console.log("Deployed at: ", veToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
