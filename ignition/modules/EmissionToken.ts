import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

export default buildModule("EmissionToken", (m) => {
  const account = m.getAccount(0);
  const name = "EmissionToken";
  const symbol = "EMISSION_TOKEN";

  const emissionToken = m.contract("contracts/EmissionToken.sol:EmissionToken", [name, symbol]);

  m.call(emissionToken, "initialMint", [account]);

  return { emissionToken };
});
