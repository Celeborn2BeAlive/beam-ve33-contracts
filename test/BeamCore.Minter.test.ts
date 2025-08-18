import hre, { ignition } from "hardhat";
import BeamCore from "../ignition/modules/Beam.Core";
import { getAddress, parseEther } from "viem";
import { isHardhatNetwork, MAX_LOCKTIME, WEEK } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const TOKEN_AMOUNT_MULTIPLIER = parseEther("1");
const INITIAL_TOKEN_SUPPLY = parseEther("50000000")

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

    // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
    await beamToken.write.mint([deployerAddress, INITIAL_TOKEN_SUPPLY]);
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

      const totalSupply = await beamToken.read.totalSupply();

      // Try to run epoch flip after 1 week
      await simulateOneWeek(activePeriod);
      await minterProxy.write.update_period();

      // Explicit check that we mint 2_600_000 tokens first epoch, test should be updated with tokenomics
      const expectedEmission = 2_600_000n * TOKEN_AMOUNT_MULTIPLIER;
      expect(await beamToken.read.totalSupply()).to.equals(totalSupply + expectedEmission);
    });

    it("Should distribute rebase as locked share", async () => {
      const { minterProxy, activePeriod, beamToken, votingEscrow, rebaseDistributor } = await loadFixture(initializeMinterFixture);

      // Lock 10% of total supply
      const totalSupply = await beamToken.read.totalSupply();
      const depositAmount = totalSupply / 10n;
      await beamToken.write.approve([votingEscrow.address, depositAmount]);
      await votingEscrow.write.create_lock([depositAmount, MAX_LOCKTIME]);

      // Ensure rebase rate is set higher than 10% (here 10.1%)
      await minterProxy.write.setRebase([101n]);

      const expectedEmission = await minterProxy.read.STARTING_EMISSION();

      // Try to run epoch flip after 1 week
      await simulateOneWeek(activePeriod);
      await minterProxy.write.update_period();

      // When 10% of total supply is locked, rebase should receive 10% of emissions
      expect(await beamToken.read.balanceOf([rebaseDistributor.address])).to.equals(
        expectedEmission / 10n,
      );
    });

    it("Should distribute rebase not higher that config share", async () => {
      const { minterProxy, activePeriod, beamToken, votingEscrow, rebaseDistributor } = await loadFixture(initializeMinterFixture);

      // Lock 10% of total supply
      const totalSupply = await beamToken.read.totalSupply();
      const depositAmount = totalSupply / 10n;
      await beamToken.write.approve([votingEscrow.address, depositAmount]);
      await votingEscrow.write.create_lock([depositAmount, MAX_LOCKTIME]);

      // Set rebase to 5% max
      await minterProxy.write.setRebase([50n]);

      const expectedEmission = await minterProxy.read.STARTING_EMISSION();

      // Try to run epoch flip after 1 week
      await simulateOneWeek(activePeriod);
      await minterProxy.write.update_period();

      // Rebase should receive 5% of emission as specified by config
      expect(await beamToken.read.balanceOf([rebaseDistributor.address])).to.equals(
        expectedEmission / 20n,
      );
    });

    it("Should distribute team tokens according to config", async () => {
      const { minterProxy, activePeriod, beamToken, user } = await loadFixture(initializeMinterFixture);

      // Set team rate of 4.2%
      await minterProxy.write.setTeamRate([42n]);
      // Set user as team to isolate tokens
      await minterProxy.write.setTeam([user.account.address]);
      await minterProxy.write.acceptTeam({account: user.account});

      const expectedEmission = await minterProxy.read.STARTING_EMISSION();

      // Try to run epoch flip after 1 week
      await simulateOneWeek(activePeriod);
      await minterProxy.write.update_period();

      // Team should received 10.42% of token emissions
      expect(await beamToken.read.balanceOf([user.account.address])).to.equals(
        expectedEmission * 42n / 1000n,
      );
    });

    it("Should distribute gauge emissions", async () => {
      const { minterProxy, activePeriod, beamToken, votingEscrow, epochDistributorProxy } = await loadFixture(initializeMinterFixture);

      // Lock 10% of total supply
      const totalSupply = await beamToken.read.totalSupply();
      const depositAmount = totalSupply / 10n;
      await beamToken.write.approve([votingEscrow.address, depositAmount]);
      await votingEscrow.write.create_lock([depositAmount, MAX_LOCKTIME]);

      // Ensure rebase rate is set higher than 10% (here 10.1%)
      await minterProxy.write.setRebase([101n]);

      // Set team rate of 4.2%
      await minterProxy.write.setTeamRate([42n]);

      const expectedEmission = await minterProxy.read.STARTING_EMISSION();

      // Try to run epoch flip after 1 week
      await simulateOneWeek(activePeriod);
      await minterProxy.write.update_period();

      const rebaseEmission = expectedEmission / 10n;
      const teamEmission = expectedEmission * 42n / 1000n;

      // Gauge should receive the delta between all emissions and (rebase + team) emissions
      const expectedGaugeEmission = expectedEmission - rebaseEmission - teamEmission;
      expect(await beamToken.read.balanceOf([epochDistributorProxy.address])).to.equals(
        expectedGaugeEmission,
      );
    });

    it("Should decrease emissions each week then increase after tail period", async () => {
      const { minterProxy, activePeriod, beamToken, votingEscrow, epochDistributorProxy } = await loadFixture(initializeMinterFixture);

      // Lock 10% of total supply
      const totalSupply = await beamToken.read.totalSupply();
      const depositAmount = totalSupply / 10n;
      await beamToken.write.approve([votingEscrow.address, depositAmount]);
      await votingEscrow.write.create_lock([depositAmount, MAX_LOCKTIME]);

      await minterProxy.write.setRebase([200n]); // 20% max going to rebase
      await minterProxy.write.setTeamRate([150n]); // 15% going to team

      // Setup emission rates config:
      const PRECISION = 1000n;
      const EMISSION = PRECISION - 200n; // 20% decay
      await minterProxy.write.setEmission([EMISSION]);
      expect(await minterProxy.read.EMISSION()).to.equals(EMISSION);
      const TAIL_EMISSION = 5n; // 0.5% weekly inflation on circulating supply after tail starts
      await minterProxy.write.setTailEmission([TAIL_EMISSION]);
      expect(await minterProxy.read.TAIL_EMISSION()).to.equals(TAIL_EMISSION);

      // With this setup, tail emissions should start at epoch 10:
      const tailEmissionStartEpoch = 10;

      await minterProxy.write.setEmission([EMISSION]);

      let { nextPeriod } = await simulateOneWeek(activePeriod);
      await minterProxy.write.update_period();

      // During initial emission epochs, they are decrease each week by a factor of EMISSION / PRECISION
      for (let i = 1; i < tailEmissionStartEpoch; ++i) {
        const totalSupplyBefore = await beamToken.read.totalSupply();
        const weeklyBefore = await minterProxy.read.weekly();

        nextPeriod = (await simulateOneWeek(nextPeriod)).nextPeriod;
        await minterProxy.write.update_period();

        const weekly = await minterProxy.read.weekly();
        // Check emission update:
        expect(weekly).to.equals(weeklyBefore * EMISSION / PRECISION);

        // Check increase of total supply:
        expect(await beamToken.read.totalSupply()).to.equals(totalSupplyBefore + weekly);
      }

      // During tail emission epochs, emissions are a weekly inflation rate of circulating supply:
      for (let i = tailEmissionStartEpoch; i < 20; ++i) {
        const totalSupplyBefore = await beamToken.read.totalSupply();
        const circulatingSupplyBefore = await minterProxy.read.circulating_supply();

        // Making sure the circulating supply is less than total supply, so the inflation only
        // takes into account circulating supply and not total supply (10% of tokens have been locked initially)
        expect(circulatingSupplyBefore < totalSupplyBefore).to.be.true;

        nextPeriod = (await simulateOneWeek(nextPeriod)).nextPeriod;
        await minterProxy.write.update_period();

        const weekly = await minterProxy.read.weekly();
        // Check emission update:
        expect(weekly).to.equals(circulatingSupplyBefore * TAIL_EMISSION / PRECISION);

        // Check increase of total supply:
        expect(await beamToken.read.totalSupply()).to.equals(totalSupplyBefore + weekly);
      }
    });
  });
});
