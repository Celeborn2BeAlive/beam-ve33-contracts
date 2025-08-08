import hre, { ignition } from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress } from "../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { Voter } from "../ignition/modules/Beam.Core";

const isLocalhost = hre.network.name == "localhost";
// Tutorial: https://medium.com/@lee.marreros/the-complete-hardhat-testing-guide-for-secure-smart-contracts-a8271893606c#fa46

describe("AlgebraFactory", function() {
  before(async function () {
    if (!isLocalhost) {
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

    // // Let's deploy a VaultFactory
    const vaultFactory = await hre.viem.deployContract(
      "AlgebraVaultFactory",
      [voter.address, beamAlgebraFactory],
    );

    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);

    await algebraFactory.write.setVaultFactory([vaultFactory.address], {
      account: beamMultisigAddress,
    });

    await algebraFactory.write.createPool([
      token1.address,
      token2.address,
    ])

    const poolAddr = await algebraFactory.read.poolByPair([
      token1.address,
      token2.address,
    ]);
    const pool = await hre.viem.getContractAt("IAlgebraPool", poolAddr);
    await pool.write.initialize([4295128739n]); // Pool should be initialized for communityVault to be set
    // 4295128739 == MIN_SQRT_RATIO
    expect(await pool.read.communityVault()).to.equals(vaultFactory.address) // TODO: test is wrong, we need to test with the AlgebraVault address that should exist in the vault factory now
  });
})
