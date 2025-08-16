import hre, { ignition } from "hardhat";
import BeamCore from "../ignition/modules/Beam.Core";
import { getAddress, parseEther } from "viem";
import { isHardhatNetwork, WEEK } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const TOKEN_AMOUNT_MULTIPLIER = parseEther("1")

describe("BeamCore.Minter", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beamCore = await ignition.deploy(BeamCore);

    const { beamToken, minterProxy } = beamCore;

    // Mint 1 wei: the Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
    await beamToken.write.mint([deployerAddress, 1n]);
    // Set Minter for the tests:
    await beamToken.write.setMinter([minterProxy.address]);

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      ...beamCore,
    };
  };

  describe("Initialize epoch", async () => {
    it("Should only allow `deployer` to call `_initialize()` once", async () => {
      const { minterProxy, user } = await loadFixture(deployFixture);

      // User can't call _initialize
      await expect(minterProxy.write._initialize([[], [], 0n], {account: user.account})).to.be.rejectedWith("");

      // Deployer can call initialize
      await minterProxy.write._initialize([[], [], 0n]);

      // But not twice
      await expect(minterProxy.write._initialize([[], [], 0n])).to.be.rejectedWith("");
    });

    it("Should have `active_period` set to 0 when not initialized", async () => {
      const { minterProxy } = await loadFixture(deployFixture);
      expect(await minterProxy.read.active_period()).to.equals(0n);
    });

    it("Should have `active_period` set to thursday timestamp when initialized", async () => {
      const { publicClient, minterProxy } = await loadFixture(deployFixture);
      const hash = await minterProxy.write._initialize([[], [], 0n]);
      const tx = await publicClient.waitForTransactionReceipt({hash});
      const block = await publicClient.getBlock({blockNumber: tx.blockNumber});

      // This is thursdayTimestamp because timestamp = 0 means 1970/1/1 which was a thursday
      const thursdayTimestamp = (block.timestamp / WEEK) * WEEK;

      expect(await minterProxy.read.active_period()).to.equals(thursdayTimestamp);
    });
  });

  describe("Epoch distribution", async () => {
    const initializeMinterFixture = async () => {
      const { minterProxy, ...deploy } = await loadFixture(deployFixture);
      await minterProxy.write._initialize([[], [], 0n]);
      const activePeriod = await minterProxy.read.active_period();

      return { minterProxy, activePeriod, ...deploy };
    };

    const simulateOneWeek = async (activePeriod: bigint) => {
      const nextPeriod = activePeriod + WEEK;
      await time.setNextBlockTimestamp(activePeriod + WEEK);
      return { nextPeriod };
    };

    it("Should not update epoch when not initialized", async () => {
      const { minterProxy } = await loadFixture(deployFixture);

      // Try to run epoch flip
      await minterProxy.write.update_period();

      // Still 0:
      expect(await minterProxy.read.active_period()).to.equals(0n);
    });

    it("Should not update epoch when a week has not passed", async () => {
      const { minterProxy, activePeriod } = await loadFixture(initializeMinterFixture);

      // Try to run epoch flip
      await minterProxy.write.update_period();

      // Still activePeriod:
      expect(await minterProxy.read.active_period()).to.equals(activePeriod);
    });

    it("Should update epoch when a week has passed", async () => {
      const { minterProxy, activePeriod } = await loadFixture(initializeMinterFixture);

      const { nextPeriod } = await simulateOneWeek(activePeriod);

      // Try to run epoch flip
      await minterProxy.write.update_period();

      // Should be nextPeriod
      expect(await minterProxy.read.active_period()).to.equals(nextPeriod);
    });

    it("Should mint `2_600_000` tokens first epoch", async () => {
      const { minterProxy, activePeriod, beamToken } = await loadFixture(initializeMinterFixture);

      await simulateOneWeek(activePeriod);

      const totalSupply = await beamToken.read.totalSupply();

      // Try to run epoch flip
      await minterProxy.write.update_period();

      // Should be nextPeriod
      expect(await beamToken.read.totalSupply()).to.equals(totalSupply + 2_600_000n * TOKEN_AMOUNT_MULTIPLIER);
    });

    it("Should distribute rebase", async () => {

    });

    it("Should distribute team tokens", async () => {

    });

    it("Should distribute farming rewards", async () => {

    });

    it("Should decrease emissions each week", async () => {

    });

    it("Should increase emissions after two years", async () => {

    });
  });
});
