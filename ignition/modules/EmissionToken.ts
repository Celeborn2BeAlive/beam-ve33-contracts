import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

export default buildModule("EmissionToken", (m) => {
  const name = "EmissionToken";
  const symbol = "EMISSION_TOKEN";
  const beamToken = m.contract("EmissionToken", [name, symbol]);

  const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");

  m.call(beamToken, "initialMint", [beamMultisigAddress,]);

  return { beamToken };
});
