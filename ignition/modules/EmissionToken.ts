import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";
import constructorArgs from "./EmissionToken.constructorArgs"

export default buildModule("EmissionToken", (m) => {
  const beamToken = m.contract("contracts/EmissionToken.sol:EmissionToken", constructorArgs);

  const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");

  m.call(beamToken, "initialMint", [beamMultisigAddress,]);

  return { beamToken };
});
