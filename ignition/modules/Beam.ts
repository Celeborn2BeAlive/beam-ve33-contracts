import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";

const ZERO_ADDRESS = getAddress("0x0000000000000000000000000000000000000000")

const beamTokenName = "Beam";
const beamTokenSymbol = "BEAM";
export const beamTokenConstructorArgs = [beamTokenName, beamTokenSymbol]

const beamMultisigAddress = getAddress("0x0029eD88Ec602d32eB93d1c42b73a5206Ec046A3");
const beamAlgebraFactory = getAddress("0x28b5244B6CA7Cb07f2f7F40edE944c07C2395603")
const wzetaAddress = getAddress("0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf");

const BeamToken = buildModule("BeamToken", (m) => {
  const beamToken = m.contract("contracts/EmissionToken.sol:EmissionToken", beamTokenConstructorArgs);

  // m.call(beamToken, "initialMint", [beamMultisigAddress,]);

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

  const rewardsDistributor = m.contract("contracts/RewardsDistributorV2.sol:RewardsDistributorV2", [votingEscrow,]);

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

  const minterProxy = m.contractAt("MinterUpgradeable", minterTransparentProxy)

  return { minterImplementation, minterProxy, proxyAdmin };
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

const VotingIncentivesFactory = buildModule("VotingIncentivesFactory", (m) => {
  const { beamToken } = m.useModule(BeamToken);

  const globalFactory = ZERO_ADDRESS; // Set after deployment of GlobalFactory
  const defaultTokens = [beamToken];
  const votingIncentivesFactory = m.contract("VotingIncentivesFactory", [globalFactory, defaultTokens]);

  // TODO votingIncentivesFactory.setGlobalFactory

  return { votingIncentivesFactory };
});

const GaugeFactory = buildModule("GaugeFactory", (m) => {
  const globalFactory = ZERO_ADDRESS; // Set after deployment of GlobalFactory

  const gaugeFactory = m.contract("GaugeFactory", [globalFactory,]);

  // TODO gaugeFactory.setGlobalFactory

  return { gaugeFactory };
});

const AlgebraVaultFactory = buildModule("AlgebraVaultFactory", (m) => {
  const { voter } = m.useModule(Voter);

  const algebraVaultFactory = m.contract("AlgebraVaultFactory", [voter, beamAlgebraFactory]);

  // TODO The AlgebraVaultFactory should be set on the AlgebraFactory
  // with AlgebraFactory.setVaultFactory
  // It will call AlgebraVaultFactory.createVaultForPool at each new pool
  // deployment.

  // TODO For all existing pools we need to call .setCommunityVault on each one to plug-in an AlgebraVault instance.
  // one issue with that is only the `algebraFactory` recorded in AlgebraVaultFactory can do the .createVaultForPool
  // and it cannot be changed after AlgebraVaultFactory is instanciated.
  // TODO Add a new role to AlgebraVaultFactory to allow the creation and assignation of AlgebraVault to an existing pool

  // TODO In order to call AlgebraVaultFactory.setCommunityFee for a pool
  // we need the AlgebraVaultFactory to have role POOLS_ADMINISTRATOR_ROLE
  // on the AlgebraFactory.

  return { algebraVaultFactory }
});

const Claimer = buildModule("Claimer", (m) => {
  const { votingEscrow } = m.useModule(VotingEscrow);
  const claimer = m.contract("Claimer", [votingEscrow,]);
  return { claimer };
});

const IncentiveMakerUpgradeable = buildModule("IncentiveMaker", (m) => {
  const { proxyAdmin } = m.useModule(ProxyAdmin);
  const { beamToken } = m.useModule(BeamToken);

  const incentiveMakerImplementation = m.contract("IncentiveMakerUpgradeable", undefined, {
    id: "IncentiveMakerUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(incentiveMakerImplementation, "initialize",
    [beamToken, wzetaAddress],
  );

  const incentiveMakerTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    incentiveMakerImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  const incentiveMakerProxy = m.contractAt("IncentiveMakerUpgradeable", incentiveMakerTransparentProxy)

  return { incentiveMakerImplementation, incentiveMakerProxy, proxyAdmin }
});

const PairFactoryUpgradeable = buildModule("PairFactoryUpgradeable", (m) => {
  const { proxyAdmin } = m.useModule(ProxyAdmin);

  const pairFactoryImplementation = m.contract("PairFactoryUpgradeable", undefined, {
    id: "PairFactoryUpgradeableImplementation",
  });
  const encodedInitializeCall = m.encodeFunctionCall(pairFactoryImplementation, "initialize",
    [],
  );

  const pairFactoryTransparentProxy = m.contract("TransparentUpgradeableProxy", [
    pairFactoryImplementation,
    proxyAdmin,
    encodedInitializeCall,
  ]);

  const pairFactoryProxy = m.contractAt("PairFactoryUpgradeable", pairFactoryTransparentProxy)

  return { pairFactoryImplementation, pairFactoryProxy, proxyAdmin }
})

const GlobalFactory = buildModule("GlobalFactory", (m) => {
  const { voter } = m.useModule(Voter);
  const { beamToken } = m.useModule(BeamToken);
  const { epochDistributorProxy } = m.useModule(EpochDistributorUpgradeable)
  const { pairFactoryProxy } = m.useModule(PairFactoryUpgradeable);
  const { gaugeFactory } = m.useModule(GaugeFactory);
  const { votingIncentivesFactory } = m.useModule(VotingIncentivesFactory);
  const { claimer } = m.useModule(Claimer);
  const { incentiveMakerProxy } = m.useModule(IncentiveMakerUpgradeable);

  // constructor(address _voter, address _thena, address _distribution, address _pfsld, address _pfalgb, address _gf, address _vif, address _theNFT, address _claimer, address _incentiveMaker)
  const globalFactory = m.contract("GlobalFactory", [
    voter,
    beamToken,
    epochDistributorProxy,
    pairFactoryProxy,
    beamAlgebraFactory,
    gaugeFactory,
    votingIncentivesFactory,
    beamMultisigAddress,
    claimer,
    incentiveMakerProxy,
  ]);

  return { globalFactory };
});

export default buildModule("BeamProtocol", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { rewardsDistributor } = m.useModule(RewardsDistributor);
  const { proxyAdmin } = m.useModule(ProxyAdmin)
  const { minterImplementation, minterProxy } = m.useModule(MinterUpgradeable);
  const { voter } = m.useModule(Voter);
  const { epochDistributorImplementation, epochDistributorProxy } = m.useModule(EpochDistributorUpgradeable);
  const { votingIncentivesFactory } = m.useModule(VotingIncentivesFactory);
  const { gaugeFactory } = m.useModule(GaugeFactory);
  const { algebraVaultFactory } = m.useModule(AlgebraVaultFactory);
  const { incentiveMakerImplementation, incentiveMakerProxy } = m.useModule(IncentiveMakerUpgradeable)
  const { claimer } = m.useModule(Claimer);
  const { globalFactory } = m.useModule(GlobalFactory);
  const { pairFactoryImplementation, pairFactoryProxy } = m.useModule(PairFactoryUpgradeable)

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
    votingIncentivesFactory,
    gaugeFactory,
    algebraVaultFactory,
    incentiveMakerImplementation,
    incentiveMakerProxy,
    claimer,
    globalFactory,
    pairFactoryImplementation,
    pairFactoryProxy,
  }
});
