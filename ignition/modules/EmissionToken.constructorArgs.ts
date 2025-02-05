const name = "EmissionToken";
const symbol = "EMISSION_TOKEN";
export default [name, symbol];

// After deployment, verify with:
// pnpm hardhat verify [ADDR] --constructor-args ignition/modules/EmissionToken.constructorArgs.ts --contract contracts/flatten.sol:EmissionToken
