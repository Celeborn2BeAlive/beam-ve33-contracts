import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

const beamTokenName = "Beam";
const beamTokenSymbol = "BEAM";
export const beamTokenConstructorArgs = [beamTokenName, beamTokenSymbol]

export default buildModule("Beam", (m) => {
  const beamToken = m.contract("contracts/EmissionToken.sol:EmissionToken", beamTokenConstructorArgs);

  const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");

  m.call(beamToken, "initialMint", [beamMultisigAddress,]);
  m.call(beamToken, "setMinter", [beamMultisigAddress,]);

  return { beamToken };
});
