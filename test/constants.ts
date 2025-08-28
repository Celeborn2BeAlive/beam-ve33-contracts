import hre from "hardhat";
import { parseEther } from "viem";

export const isLocalhostNetwork = hre.network.name == "localhost";
// Tutorial: https://medium.com/@lee.marreros/the-complete-hardhat-testing-guide-for-secure-smart-contracts-a8271893606c#fa46
export const isHardhatNetwork = hre.network.name == "hardhat";

export const WEEK = 86400n * 7n;
export const INITIAL_BEAM_TOKEN_SUPPLY = parseEther("50000000");
