import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

export const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000")

export const beamTokenName = "Beam";
export const beamTokenSymbol = "BEAM";
export const beamTokenConstructorArgs = [beamTokenName, beamTokenSymbol]

export const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");
export const beamAlgebraFactory = getAddress("0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603")
export const wzetaAddress = getAddress("0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf");

export const BeamToken = buildModule("BeamToken", (m) => {
  const beamToken = m.contract("EmissionToken", beamTokenConstructorArgs);

  // m.call(beamToken, "initialMint", [beamMultisigAddress,]);

  return { beamToken };
});

const VotingEscrow = buildModule("VotingEscrow", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const artProxyAddress = ZERO_ADDRESS;

  const votingEscrow = m.contract("VotingEscrow", [beamToken, artProxyAddress]);

  return { votingEscrow };
});


const RewardsDistributor = buildModule("RewardsDistributor", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);

  const rewardsDistributor = m.contract("RewardsDistributorV2", [votingEscrow,]);

  return { rewardsDistributor };
});

const ProxyAdmin = buildModule("ProxyAdmin", (m) => {
  const proxyAdmin = m.contract("ProxyAdmin");
  return { proxyAdmin };
});

const MinterUpgradeable = buildModule("MinterUpgradeable", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rewardsDistributor } = m.useModule(RewardsDistributor);
  const epochDistributor = ZERO_ADDRESS;

  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const minterImplementation = m.contract("MinterUpgradeable", undefined, {
    id: "MinterUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(minterImplementation, "initialize",
    [epochDistributor, votingEscrow, rewardsDistributor],
  );

  const minterTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    minterImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  m.call(beamToken, "setMinter", [minterTransparentProxy,]);
  m.call(rewardsDistributor, "setDepositor", [minterTransparentProxy,]);

  const minterProxy = m.contractAt("MinterUpgradeable", minterTransparentProxy)

  return { minterImplementation, minterProxy, proxyAdmin };
});

const Voter = buildModule("Voter", (m) => {
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

  const epochDistributorProxy = m.contractAt("EpochDistributorUpgradeable", epochDistributorTransparentProxy)

  m.call(minterProxy, "setEpochDistributor", [epochDistributorProxy,]);

  return { epochDistributorImplementation, epochDistributorProxy, proxyAdmin }
});

const Claimer = buildModule("Claimer", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);
  const claimer = m.contract("Claimer", [votingEscrow,]);
  return { claimer };
});


export default buildModule("BeamProtocol", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rewardsDistributor } = m.useModule(RewardsDistributor);
  const { proxyAdmin } = m.useModule(ProxyAdmin)
  const { minterImplementation, minterProxy } = m.useModule(MinterUpgradeable);
  const { voter } = m.useModule(Voter);
  const { epochDistributorImplementation, epochDistributorProxy } = m.useModule(EpochDistributorUpgradeable);
  const { claimer } = m.useModule(Claimer);

  return {
    proxyAdmin,
    beamToken,
    votingEscrow,
    rewardsDistributor,
    minterImplementation,
    minterProxy,
    voter,
    epochDistributorImplementation,
    epochDistributorProxy,
    claimer,
  }
});
