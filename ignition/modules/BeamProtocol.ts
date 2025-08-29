import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import Beam from "./Beam.Core";
import BeamSolidyDEX from "./Beam.SolidyDEX";
import BeamVe33Factories from "./Beam.Ve33Factories";

export default buildModule("BeamProtocol", (m) => {
  const beam = m.useModule(Beam);
  const solidlyDEX = m.useModule(BeamSolidyDEX)
  const ve33Factories = m.useModule(BeamVe33Factories)

  return {
    ...beam,
    ...solidlyDEX,
    ...ve33Factories,
  }
});
