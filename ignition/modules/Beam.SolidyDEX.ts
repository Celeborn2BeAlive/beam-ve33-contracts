import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";
import BeamCore, { wzetaAddress } from "./Beam.Core";

const SolidlyPairFactoryUpgradeable = buildModule("SolidlyPairFactoryUpgradeable", (m) => {
  const { proxyAdmin } = m.useModule(BeamCore);

  const solidlyPairFactoryImplementation = m.contract("PairFactoryUpgradeable", undefined, {
    id: "PairFactoryUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(solidlyPairFactoryImplementation, "initialize",
    [],
  );

  const solidlyPairFactoryTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    solidlyPairFactoryImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  const solidlyPairFactoryProxy = m.contractAt("PairFactoryUpgradeable", solidlyPairFactoryTransparentProxy)

  return { solidlyPairFactoryImplementation, solidlyPairFactoryProxy, proxyAdmin }
})

const SolidlyRouter = buildModule("SolidlyRouter", (m) => {
  const { solidlyPairFactoryProxy } = m.useModule(SolidlyPairFactoryUpgradeable);
  const solidlyRouter = m.contract("RouterV2", [
    solidlyPairFactoryProxy,
    wzetaAddress,
  ]);
  return { solidlyRouter };
});

export default buildModule("Beam_SolidyDEX", (m) => {
  const { solidlyPairFactoryImplementation, solidlyPairFactoryProxy, proxyAdmin } = m.useModule(SolidlyPairFactoryUpgradeable)
  const { solidlyRouter } = m.useModule(SolidlyRouter);

  return {
    proxyAdmin,
    solidlyPairFactoryImplementation,
    solidlyPairFactoryProxy,
    solidlyRouter,
  }
});
