import { beamTokenConstructorArgs } from "./Beam";

export default beamTokenConstructorArgs;

// After deployment, flatten source files and verify with:
// pnpm exec hardhat flatten > contracts/flatten.sol
// pnpm hardhat verify [ADDR] --constructor-args ignition/modules/Beam.EmissionToken.constructorArgs.ts --contract contracts/flatten.sol:BeamToken
