import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { beamTokenName, beamTokenSymbol, ZERO_ADDRESS } from "./constants";

const ProxyAdmin = buildModule("ProxyAdmin", (m) => {
  const proxyAdmin = m.contract("ProxyAdmin");
  return { proxyAdmin };
});

export const BeamToken = buildModule("BeamToken", (m) => {
  const beamToken = m.contract("EmissionToken", [beamTokenName, beamTokenSymbol]);
  return { beamToken };
});

const VeArtProxyUpgradeable = buildModule("VeArtProxyUpgradeable", (m) => {
  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const veArtProxyImplementation = m.contract("VeArtProxyUpgradeable", undefined, {
    id: "VeArtProxyUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(veArtProxyImplementation, "initialize");

  const veArtProxyTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    veArtProxyImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  const veArtProxyProxy = m.contractAt("VeArtProxyUpgradeable", veArtProxyTransparentProxy, {
    id: "VeArtProxyUpgradeableProxy"
  })

  return { veArtProxyImplementation, veArtProxyProxy, proxyAdmin };
});

const VotingEscrow = buildModule("VotingEscrow", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { veArtProxyProxy } = m.useModule(VeArtProxyUpgradeable);

  const votingEscrow = m.contract("VotingEscrow", [beamToken, veArtProxyProxy]);

  return { votingEscrow };
});

const RebaseDistributor = buildModule("RebaseDistributor", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);

  const rebaseDistributor = m.contract("RebaseDistributor", [votingEscrow,]);

  return { rebaseDistributor };
});


const MinterUpgradeable = buildModule("MinterUpgradeable", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rebaseDistributor } = m.useModule(RebaseDistributor);
  const epochDistributor = ZERO_ADDRESS;

  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const minterImplementation = m.contract("MinterUpgradeable", undefined, {
    id: "MinterUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(minterImplementation, "initialize",
    [epochDistributor, votingEscrow, rebaseDistributor],
  );

  const minterTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    minterImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  m.call(beamToken, "setMinter", [minterTransparentProxy,]);
  m.call(rebaseDistributor, "setDepositor", [minterTransparentProxy,]);

  const minterProxy = m.contractAt("MinterUpgradeable", minterTransparentProxy, {
    id: "MinterUpgradeableProxy"
  })

  return { minterImplementation, minterProxy, proxyAdmin };
});

export const Voter = buildModule("Voter", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { minterProxy } = m.useModule(MinterUpgradeable);

  const voter = m.contract("Voter", [votingEscrow, minterProxy,]);

  m.call(votingEscrow, "setVoter", [voter,]);

  return { voter };
});

const EpochDistributorUpgradeable = buildModule("EpochDistributorUpgradeable", (m) => {
  const { minterProxy } = m.useModule(MinterUpgradeable);
  const { beamToken } = m.useModule(BeamToken);
  const { voter } = m.useModule(Voter);
  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const epochDistributorImplementation = m.contract("EpochDistributorUpgradeable", undefined, {
    id: "EpochDistributorUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(epochDistributorImplementation, "initialize",
    [minterProxy, beamToken, voter],
  );

  const epochDistributorTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    epochDistributorImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  const epochDistributorProxy = m.contractAt("EpochDistributorUpgradeable", epochDistributorTransparentProxy, {
      id: "EpochDistributorUpgradeableProxy",
    }
  )

  m.call(minterProxy, "setEpochDistributor", [epochDistributorProxy,]);

  return { epochDistributorImplementation, epochDistributorProxy, proxyAdmin }
});

const Claimer = buildModule("Claimer", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);
  const claimer = m.contract("Claimer", [votingEscrow,]);
  return { claimer };
});


export default buildModule("BeamCore", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { veArtProxyProxy } = m.useModule(VeArtProxyUpgradeable);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rebaseDistributor } = m.useModule(RebaseDistributor);
  const { proxyAdmin } = m.useModule(ProxyAdmin)
  const { minterImplementation, minterProxy } = m.useModule(MinterUpgradeable);
  const { voter } = m.useModule(Voter);
  const { epochDistributorImplementation, epochDistributorProxy } = m.useModule(EpochDistributorUpgradeable);
  const { claimer } = m.useModule(Claimer);

  return {
    proxyAdmin,
    beamToken,
    veArtProxyProxy,
    votingEscrow,
    rebaseDistributor,
    minterImplementation,
    minterProxy,
    voter,
    epochDistributorImplementation,
    epochDistributorProxy,
    claimer,
  }
});
