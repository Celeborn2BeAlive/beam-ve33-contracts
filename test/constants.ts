import hre, { ignition } from "hardhat";

export const isLocalhostNetwork = hre.network.name == "localhost";
// Tutorial: https://medium.com/@lee.marreros/the-complete-hardhat-testing-guide-for-secure-smart-contracts-a8271893606c#fa46
export const isHardhatNetwork = hre.network.name == "hardhat";

export const WEEK = 86400n * 7n;
export const MAX_LOCKTIME = 2n * 365n * 86400n; // 2 years

export const IGNITION_DEPLOYMENTS_ROOT = `${__dirname}/../ignition/deployments`
