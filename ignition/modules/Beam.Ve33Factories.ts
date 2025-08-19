import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import BeamCore from "./Beam.Core";
import BeamSolidyDEX from "./Beam.SolidyDEX";
import { beamAlgebraFactory, beamMultisigAddress, POOL_TYPE_ALGEBRA, wzetaAddress, ZERO_ADDRESS } from "./constants";

const VotingIncentivesFactory = buildModule("VotingIncentivesFactory", (m) => {
  const { beamToken } = m.useModule(BeamCore);

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
  const { voter } = m.useModule(BeamCore);

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

const IncentiveMakerUpgradeable = buildModule("IncentiveMaker", (m) => {
  const { proxyAdmin } = m.useModule(BeamCore);
  const { beamToken } = m.useModule(BeamCore);

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

  const incentiveMakerProxy = m.contractAt("IncentiveMakerUpgradeable", incentiveMakerTransparentProxy, {
    id: "IncentiveMakerUpgradeableProxy",
  })

  return { incentiveMakerImplementation, incentiveMakerProxy, proxyAdmin }
});

const GlobalFactory = buildModule("GlobalFactory", (m) => {
  const { voter } = m.useModule(BeamCore);
  const { beamToken } = m.useModule(BeamCore);
  const { epochDistributorProxy } = m.useModule(BeamCore)
  const { solidlyPairFactoryProxy } = m.useModule(BeamSolidyDEX);
  const { gaugeFactory } = m.useModule(GaugeFactory);
  const { votingIncentivesFactory } = m.useModule(VotingIncentivesFactory);
  const { claimer } = m.useModule(BeamCore);
  const { incentiveMakerProxy } = m.useModule(IncentiveMakerUpgradeable);

  // constructor(address _voter, address _thena, address _distribution, address _pfsld, address _pfalgb, address _gf, address _vif, address _theNFT, address _claimer, address _incentiveMaker)
  const globalFactory = m.contract("GlobalFactory", [
    voter,
    beamToken,
    epochDistributorProxy,
    solidlyPairFactoryProxy,
    beamAlgebraFactory,
    gaugeFactory,
    votingIncentivesFactory,
    beamMultisigAddress,
    claimer,
    incentiveMakerProxy,
  ]);

  m.call(votingIncentivesFactory, "setGlobalFactory", [globalFactory,]);
  m.call(gaugeFactory, "setGlobalFactory", [globalFactory,]);
  m.call(voter, "setManagerStatus", [globalFactory, true,]);
  m.call(globalFactory, "setPoolType", [POOL_TYPE_ALGEBRA, true,]);
  m.call(globalFactory, "setPoolTypeCreator", [POOL_TYPE_ALGEBRA, true, m.getAccount(0),]);
  m.call(globalFactory, "addToken", [[beamToken],]);

  return { globalFactory };
});


export default buildModule("Beam_Ve33Factories", (m) => {
  const { votingIncentivesFactory } = m.useModule(VotingIncentivesFactory);
  const { gaugeFactory } = m.useModule(GaugeFactory);
  const { algebraVaultFactory } = m.useModule(AlgebraVaultFactory);
  const { incentiveMakerImplementation, incentiveMakerProxy } = m.useModule(IncentiveMakerUpgradeable)
  const { globalFactory } = m.useModule(GlobalFactory);

  return {
    votingIncentivesFactory,
    gaugeFactory,
    algebraVaultFactory,
    incentiveMakerImplementation,
    incentiveMakerProxy,
    globalFactory,
  }
});

