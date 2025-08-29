import hre from "hardhat";
import { parseEther } from "viem";

const { ZETACHAIN_RPC_URL } = process.env;

export const isLocalhostNetwork = hre.network.name == "localhost";
export const isZetachainForkNetwork = (
  isLocalhostNetwork &&
  hre.config.networks.localhost.forking?.url === ZETACHAIN_RPC_URL
  && (hre.config.networks.localhost.forking?.enabled || hre.config.networks.localhost.forking?.enabled === undefined)
);
// Tutorial: https://medium.com/@lee.marreros/the-complete-hardhat-testing-guide-for-secure-smart-contracts-a8271893606c#fa46
export const isHardhatNetwork = hre.network.name == "hardhat";

export const WEEK = 86400n * 7n;
export const INITIAL_BEAM_TOKEN_SUPPLY = parseEther("50000000");
