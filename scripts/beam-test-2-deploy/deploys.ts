import { getAddress, Address } from "viem";

const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000")
const deploymentAddresses = {
  ZERO_ADDRESS,
  EMISSION_TOKEN_ADDRESS: "0xc1d22a519829f2d392a47301ffba0ee5f51c4b1d", // https://zetachain.blockscout.com/address/0xc1d22a519829f2d392a47301ffba0ee5f51c4b1d
  VE_ARTPROXY_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  VE_TOKEN_ADDRESS: "0x2469bc4febeb221bc69ca7dba31bf551ffac6367", // https://zetachain.blockscout.com/address/0x2469bc4febeb221bc69ca7dba31bf551ffac6367
  REWARDS_DISTRIBUTOR_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  PERMISSIONS_REGISTRY_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  BRIBE_FACTORY_V3_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  GAUGE_FACTORY_V2_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  GAUGE_FACTORY_V2_CL_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  PAIR_FACTORY_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  VOTER_V3_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  PROTOCOL_FEE_HANDLER_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  MINTER_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  PAIR_API_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  REWARDS_API_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  VENFT_API_ADDRESS: null, // https://zetachain.blockscout.com/address/null
  DISTRIBUTE_FEES_ADDRESS: null, // https://zetachain.blockscout.com/address/null
}

export function checkIsUndeployed(name: keyof typeof deploymentAddresses): void {
  if (deploymentAddresses[name] !== null && deploymentAddresses[name] !== undefined) {
    console.error(`Contract already deployed at ${deploymentAddresses[name]}; replace with null in deploys.js to override.`);
    process.exit(0);
  }
}

export function checkIsDeployed(name: keyof typeof deploymentAddresses): Address {
  if (deploymentAddresses[name] === null || deploymentAddresses[name] === undefined) {
    console.error(`Contract not deployed; run deployment script first.`);
    process.exit(0);
  }
  return getAddress(deploymentAddresses[name]);
}

export { ZERO_ADDRESS };
