import hre, { ignition } from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress, ZERO_ADDRESS } from "../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { Voter } from "../ignition/modules/Beam.Core";
import { isLocalhostNetwork } from "./constants";


describe("AlgebraFactory", function() {
  before(async function () {
    if (!isLocalhostNetwork) {
      this.skip();
    }
    await impersonateAccount(beamMultisigAddress);
  });

  it("should have Beam multisig has owner", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    expect(await algebraFactory.read.owner()).to.equal(beamMultisigAddress)

    await algebraFactory.write.startRenounceOwnership({
      account: beamMultisigAddress,
    })

    await algebraFactory.write.stopRenounceOwnership({
      account: beamMultisigAddress,
    })
  });

  it.only("experiment with vault factory", async () => {
    // Let's deploy 2 tokens
    const token1 = await hre.viem.deployContract(
      "EmissionToken",
      ["Token1", "TKN1"],
    );

    const token2 = await hre.viem.deployContract(
      "EmissionToken",
      ["Token2", "TKN2"],
    );

    const { voter } = await ignition.deploy(Voter);

    // Let's deploy a AlgebraVaultFactory
    const vaultFactory = await hre.viem.deployContract(
      "AlgebraVaultFactory",
      [voter.address, beamAlgebraFactory],
    );

    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);

    // Set the AlgebraVaultFactory as vault factory of the AlgebraFactory
    await algebraFactory.write.setVaultFactory([vaultFactory.address], {
      account: beamMultisigAddress,
    });

    // Create a pool with our 2 tokens
    await algebraFactory.write.createPool([
      token1.address,
      token2.address,
    ])

    // Initialize the pool with a price, it will create the fee vault and set it as communityVault of the pool
    const poolAddr = await algebraFactory.read.poolByPair([
      token1.address,
      token2.address,
    ]);
    const pool = await hre.viem.getContractAt("IAlgebraPool", poolAddr);
    await pool.write.initialize([4295128739n]); // 4295128739 == MIN_SQRT_RATIO

    // Get the vault which should have been created now
    const algebraVaultAddr = await vaultFactory.read.getVaultForPool([poolAddr]);

    // Expect the communityVault of the pool to be our vault
    expect(algebraVaultAddr).to.not.equals(ZERO_ADDRESS);
    expect(await pool.read.communityVault()).to.equals(algebraVaultAddr);
  });
})
