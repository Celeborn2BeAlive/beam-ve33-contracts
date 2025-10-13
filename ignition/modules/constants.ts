import { getAddress } from "viem";

export const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000")
export const beamTokenName = "Staging_Beam";
export const beamTokenSymbol = "STAGING_BEAM";
export const beamUrl = "https://beamdex.xyz/"
export const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");
export const beamAlgebraFactory = getAddress("0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603")
export const wzetaAddress = getAddress("0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf");
export const veBeamTokenName = `ve${beamTokenName}`
export const veBeamTokenSymbol = `ve${beamTokenSymbol}`
export const POOL_TYPE_ALGEBRA = 2;
