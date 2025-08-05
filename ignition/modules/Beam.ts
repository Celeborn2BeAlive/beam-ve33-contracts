import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000")

const beamTokenName = "Beam";
const beamTokenSymbol = "BEAM";
export const beamTokenConstructorArgs = [beamTokenName, beamTokenSymbol]

const BeamToken = buildModule("BeamToken", (m) => {
  const beamToken = m.contract("contracts/EmissionToken.sol:EmissionToken", beamTokenConstructorArgs);

  const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");

  m.call(beamToken, "initialMint", [beamMultisigAddress,]);

  return { beamToken };
});

const VotingEscrow = buildModule("VotingEscrow", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const artProxyAddress = ZERO_ADDRESS;

  const votingEscrow = m.contract("contracts/VotingEscrow.sol:VotingEscrow", [beamToken, artProxyAddress]);

  return { votingEscrow };
});


const RewardsDistributor = buildModule("RewardsDistributor", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);

  const rewardsDistributor = m.contract("contracts/RewardsDistributor.sol:RewardsDistributor", [votingEscrow,]);

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

  const minterUpgradeable = m.contract("MinterUpgradeable", undefined, {
    id: "MinterUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(minterUpgradeable, "initialize",
    [epochDistributor, votingEscrow, rewardsDistributor],
  );

  const minterTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    minterUpgradeable,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  m.call(beamToken, "setMinter", [minterTransparentProxy,]);

  const minterProxy = m.contractAt("MinterUpgradeable", minterTransparentProxy)

  return { proxyAdmin, minterProxy };
});

const Voter = buildModule("Voter", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { minterProxy } = m.useModule(MinterUpgradeable);

  const voter = m.contract("contracts/Voter.sol:Voter", [votingEscrow, minterProxy,]);

  m.call(votingEscrow, "setVoter", [voter,]);

  return { voter };
});

const EpochDistributorUpgradeable = buildModule("EpochDistributorUpgradeable", (m) => {
  const { minterProxy } = m.useModule(MinterUpgradeable);
  const { beamToken } = m.useModule(BeamToken);
  const { voter } = m.useModule(Voter);
  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const epochDistributorUpgradeable = m.contract("EpochDistributorUpgradeable", undefined, {
    id: "EpochDistributorUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(epochDistributorUpgradeable, "initialize",
    [minterProxy, beamToken, voter],
  );

  const epochDistributorTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    epochDistributorUpgradeable,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  const epochDistributorProxy = m.contractAt("EpochDistributorUpgradeable", epochDistributorTransparentProxy)

  m.call(minterProxy, "setEpochDistributor", [epochDistributorProxy,]);

  return { epochDistributorProxy, proxyAdmin }
});

export default buildModule("BeamProtocol", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rewardsDistributor } = m.useModule(RewardsDistributor);
  const { proxyAdmin } = m.useModule(ProxyAdmin)
  const { minterProxy } = m.useModule(MinterUpgradeable);
  const { voter } = m.useModule(Voter);
  const { epochDistributorProxy } = m.useModule(EpochDistributorUpgradeable);

  return {
    beamToken,
    votingEscrow,
    rewardsDistributor,
    minterProxy,
    voter,
    epochDistributorProxy,
    proxyAdmin,
  }
});
