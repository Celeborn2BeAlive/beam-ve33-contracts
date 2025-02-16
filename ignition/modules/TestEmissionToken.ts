import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { getAddress } from "viem";
import constructorArgs from "./TestEmissionToken.constructorArgs"

export default buildModule("TestEmissionToken", (m) => {
  const testEmissionToken = m.contract("contracts/EmissionToken.sol:EmissionToken", constructorArgs);

  const receiver = getAddress("0x1c650C78D81508327e84820A43BDF4A469632b42");

  m.call(testEmissionToken, "initialMint", [receiver,]);

  return { testEmissionToken };
});
