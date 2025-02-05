import hre from "hardhat";
import { checkIsUndeployed } from "./deploys";
import constructorArguments from "./020_voting_escrow.constructorArgs"

async function main () {
    checkIsUndeployed("VE_TOKEN_ADDRESS");

    console.log('Deploying Contract...');
    const veToken = await hre.viem.deployContract("contracts/VotingEscrow.sol:VotingEscrow", constructorArguments);
    console.log("Deployed at: ", veToken.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
