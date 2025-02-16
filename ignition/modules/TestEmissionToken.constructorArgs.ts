const name = "TestEmissionToken";
const symbol = "TEST_EMISSION_TOKEN";
export default [name, symbol];

// After deployment, flatten source files and verify with:
// pnpm exec hardhat flatten > contracts/flatten.sol
// pnpm hardhat verify [ADDR] --constructor-args ignition/modules/TestEmissionToken.constructorArgs.ts --contract contracts/flatten.sol:EmissionToken
