import { checkIsDeployed, ZERO_ADDRESS } from "./deploys";
import { Address } from "viem";

// Depends on:
// - 010_token.ts

const EMISSION_TOKEN_ADDRESS = checkIsDeployed("EMISSION_TOKEN_ADDRESS");
const veArtProxyAddress = ZERO_ADDRESS;
/** Should be:
const veArtProxy = await hre.viem.getContractAt("VeArtProxyUpgradeable", VEARTPROXY_ADDRESS);
veArtProxyAddress = veArtProxy.address;
But can be deployed later.
*/
export default [EMISSION_TOKEN_ADDRESS, veArtProxyAddress] as [Address, Address];
