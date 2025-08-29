# Deploy with ignition

On hardhat network:
- `pnpm exec hardhat ignition deploy ignition/modules/BeamProtocol.ts`

On localhost zetachain forked network:
- Run fork in a terminal: `bash scripts/zetachain/fork-zetachain.bash`
- Then: `pnpm exec hardhat ignition deploy ignition/modules/BeamProtocol.ts --network localhost`

On Zetachain mainnet, The `ZETACHAIN_RPC_URL` should be defined in `.env`. It's better to deploy in several steps to
avoid RPC errors:

- `pnpm exec hardhat ignition deploy ignition/modules/Beam.Core.ts --network zetachain`
- `pnpm exec hardhat ignition deploy ignition/modules/Beam.SolidlyDEX.ts --network zetachain`
- `pnpm exec hardhat ignition deploy ignition/modules/Beam.Ve33Factories.ts --network zetachain`

# Verify contracts on Zetachain

The verification can fails several times due to Blockscout API bandwidth limitation.

With ignition:

`pnpm exec hardhat ignition verify chain-7000 --network zetachain`

Alternatively, after deployment, you can generate a script bach outputing all verification commands using:

`python ignition/modules/make_verify_script.py`

Then run the script with:

`bash ignition/modules/verify.bash`

The script can fail several times, but you can comment lines to run part of it iteratively.

It's also possible to flatten contracts as a single file:

`pnpm exec hardhat flatten > contracts/flatten.sol`

Then verify a single contract, for example `EmissionToken`:

`pnpm hardhat verify [ADDR] --constructor-args [CONSTRUCTOR_ARGS] --contract contracts/flatten.sol:EmissionToken`

Constructor arguments can be found in the generated `verify.bash`. They are extracted from ignition deployment journal.
