# Initial deployment

Deploy Beam Core

`pnpm exec hardhat ignition deploy ignition/modules/Beam.Core.ts --network zetachain --verbose`

Deploy BeamSolidyDEX

`pnpm exec hardhat ignition deploy ignition/modules/Beam.SolidlyDEX.ts --network zetachain --verbose`

Deploy Beam Factories

`pnpm exec hardhat ignition deploy ignition/modules/Beam.Ve33Factories.ts --network zetachain --verbose`

Mint initial BEAM supply to multisig

`pnpm exec hardhat ignition deploy ignition/modules/Beam.InitialMint.ts --network zetachain --verbose`

# Gauges creation

Get list of existing pools on our AlgebraFactory for which we want gauges (can be done from list of tokens) and put them in `ignition/modules/gauge_pools.ts`

Create AlgebraVault instances, link them to AlgebraPool instances (deployer address should have correct rights on AlgebraFactory), create gauges:

`pnpm exec hardhat ignition deploy ignition/modules/Beam.CreateGauges.ts --network zetachain --verbose`

- For each pool the script should:
  - Create an AlgebraVault using the AlgebraVaultFactory
  - Link the AlgebraVault to the pool with `AlgebraPool.setCommunityVault()`
    - Role required: `POOLS_ADMINISTRATOR_ROLE`
  - Set of the pool to 100% with `AlgebraPool.setCommunityFee(1e3)`
    - Role required: `POOLS_ADMINISTRATOR_ROLE`

From multigig:

Assign role `AlgebraEternalFarming.INCENTIVE_MAKER_ROLE` to our IncentiveMakerUpgreadeableProxy on AlgebraFactory.

Set our AlgebraVaultFactory as `vaultFactory` of AlgebraFactory with `AlgebraFactory.setVaultFactory()`
  - Role required: owner

After this last step, each new pool created will have an AlgebraVault as `communityVault`.

If we want to have pools not integrated in the ve(3,3) protocol, we have several choices:

- Set community fee to 0 for such pools
  - Drawback: we cannot send fees to Algebra that way
- Set community vault to another distribution contract for such pools
- Don't assign `vaultFactory` and do the process manually (with scripts) for each pool that need a gauge

In any case we need to create the gauges manually on the GlobalFactory so we still require scripts.

# ve(3,3) protocol initialization

Link minter to BEAM token

`pnpm exec hardhat ignition deploy ignition/modules/Beam.LinkMinter.ts --network zetachain --verbose`

Initialize the minter

`pnpm exec hardhat ignition deploy ignition/modules/Beam.InitializeMinter.ts --network zetachain --verbose`

