import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import BeamCore from "./Beam.Core";
import BeamSolidyDEX from "./Beam.SolidyDEX";
import { beamAlgebraFactory, beamMultisigAddress, POOL_TYPE_ALGEBRA, wzetaAddress, ZERO_ADDRESS } from "./constants";

const VotingIncentivesFactory = buildModule("VotingIncentivesFactory", (m) => {
  const { beamToken, minterProxy, votingEscrow, voter, claimer} = m.useModule(BeamCore);

  const globalFactory = ZERO_ADDRESS; // Set after deployment of GlobalFactory
  const defaultTokens = [beamToken, wzetaAddress];
  // constructor(address _globalFactory, address[] memory defaultTokens, address _minter, address _votingEscrow, address _voter, address _claimer)
  const votingIncentivesFactory = m.contract("VotingIncentivesFactory", [globalFactory, defaultTokens, minterProxy, votingEscrow, voter, claimer]);

  return { votingIncentivesFactory };
});

const GaugeFactory = buildModule("GaugeFactory", (m) => {
  const globalFactory = ZERO_ADDRESS; // Set after deployment of GlobalFactory

  const gaugeFactory = m.contract("GaugeFactory", [globalFactory,]);

  return { gaugeFactory };
});

const AlgebraVaultFactory = buildModule("AlgebraVaultFactory", (m) => {
  const { voter } = m.useModule(BeamCore);

  const algebraVaultFactory = m.contract("AlgebraVaultFactory", [voter, beamAlgebraFactory]);

  return { algebraVaultFactory }
});

const IncentiveMakerUpgradeable = buildModule("IncentiveMaker", (m) => {
  const { proxyAdmin, beamToken } = m.useModule(BeamCore);

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
  const { beamToken, voter, epochDistributorProxy, claimer } = m.useModule(BeamCore);
  const { solidlyPairFactoryProxy } = m.useModule(BeamSolidyDEX);
  const { gaugeFactory } = m.useModule(GaugeFactory);
  const { votingIncentivesFactory } = m.useModule(VotingIncentivesFactory);
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

