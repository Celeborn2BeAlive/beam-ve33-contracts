import hre from "hardhat";
import { checkIsDeployed } from "./deploys";

// Depends on 000_token.ts

async function main () {
    const [ owner ] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const EMISSION_TOKEN_ADDRESS = checkIsDeployed("EMISSION_TOKEN_ADDRESS");

    const emissionToken = await hre.viem.getContractAt("contracts/EmissionToken.sol:EmissionToken", EMISSION_TOKEN_ADDRESS);
    console.log("Deployed at: ", emissionToken.address)

    const mintTo = owner.account.address;

    // initial mint
    const hash = await emissionToken.write.initialMint([mintTo,])
    await publicClient.waitForTransactionReceipt({hash})
    console.log('Initial mint of 50M emission tokens to ' + mintTo)

    console.log('/////////////////////////')
    console.log('Check up')
    console.log('/////////////////////////')

    console.log('Owner balance (should be 50000000000000000000000000): ' + await emissionToken.read.balanceOf([mintTo,]))
    console.log('Initial minted (should be true): ' + await emissionToken.read.initialMinted())
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
