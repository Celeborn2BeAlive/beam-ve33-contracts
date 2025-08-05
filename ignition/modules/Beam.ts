import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000")

const beamTokenName = "Beam";
const beamTokenSymbol = "BEAM";
export const beamTokenConstructorArgs = [beamTokenName, beamTokenSymbol]

const Beam = buildModule("Beam", (m) => {
  const beamToken = m.contract("contracts/EmissionToken.sol:EmissionToken", beamTokenConstructorArgs);

  const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");

  m.call(beamToken, "initialMint", [beamMultisigAddress,]);

  return { beamToken };
});

const VotingEscrow = buildModule("VotingEscrow", (m) => {
  const { beamToken } = m.useModule(Beam);
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
  const minterUpgradeable = m.contract("MinterUpgradeable");

  const { beamToken } = m.useModule(Beam);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rewardsDistributor } = m.useModule(RewardsDistributor);
  const epochDistributor = ZERO_ADDRESS;

  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const encodedInitializeCall = m.encodeFunctionCall(minterUpgradeable, "initialize",
    [epochDistributor, votingEscrow, rewardsDistributor],
  );

  const minterProxy = m.contract("TransparentUpgradeableProxy", [
    minterUpgradeable,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  m.call(beamToken, "setMinter", [minterProxy,]);

  return { proxyAdmin, minterProxy };
});

export default buildModule("BeamProtocol", (m) => {
  const { beamToken } = m.useModule(Beam);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rewardsDistributor } = m.useModule(RewardsDistributor);
  const { proxyAdmin, minterProxy } = m.useModule(MinterUpgradeable);

  return { beamToken, votingEscrow, rewardsDistributor, minterProxy, proxyAdmin }
});
