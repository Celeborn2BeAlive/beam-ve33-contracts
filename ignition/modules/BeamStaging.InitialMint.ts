import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import Beam from "./Beam.Core";
import { parseEther } from "viem";

export default buildModule("BeamStaging_InitialMint", (m) => {
  const beam = m.useModule(Beam);

  m.call(beam.beamToken, "mint", [m.getAccount(0), parseEther("50000000")]);

  return {}
});
