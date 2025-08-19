import hre, { ignition } from "hardhat";
import { Address, getAddress } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { ZERO_ADDRESS } from "../ignition/modules/constants";
import { create10PercentOfTotalSupplyLock, simulateOneWeekAndFlipEpoch } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";

// This test demonstrates a setup where we use SolidyDEX pools as if they were AlgebraPool
// and create EternalFarmingGauge for them externally (i.e. without the GlobalFactory).
// We feed the gauges with a TestIncentiveMaker providing the `updateIncentive()` function
// which is called by the gauges to distribute farming rewards.

// While this test works, the system is not supposed to be used that way in production.
// See BeamCore.EpochDistributor.test.ts for a test where we mock AlgebraFactory and AlgebraPool
// in order to use the GlobalFactory to create gauges and voting incentives.

describe("BeamCore.EpochDistributorWithPairsFromSolidlyDEX", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(BeamProtocol);

    const { beamToken, minterProxy, epochDistributorProxy, voter, claimer, votingEscrow } = beam;

    // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
    await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
    await beamToken.write.setMinter([minterProxy.address]);

    // Set 0% emission to rebase and team to ease computation
    await minterProxy.write.setRebase([0n]);
    await minterProxy.write.setTeamRate([0n]);

    const USDC = await hre.viem.deployContract("ERC20PresetMinterPauser", ["USDC", "USDC"]);
    await USDC.write.mint([deployerAddress, 10_000_000_000n]);
    const WETH = await hre.viem.deployContract("ERC20PresetMinterPauser", ["Wrapped Ether", "WETH"]);
    await WETH.write.mint([deployerAddress, 42_000_000n]);

    const { solidlyPairFactoryProxy } = beam;
    await solidlyPairFactoryProxy.write.createPair([USDC.address, beamToken.address, false]);
    await solidlyPairFactoryProxy.write.createPair([WETH.address, beamToken.address, false]);
    await solidlyPairFactoryProxy.write.createPair([WETH.address, USDC.address, false]);
    const USDC_BEAM = await solidlyPairFactoryProxy.read.getPair([USDC.address, beamToken.address, false]);
    const WETH_BEAM = await solidlyPairFactoryProxy.read.getPair([WETH.address, beamToken.address, false]);
    const WETH_USDC = await solidlyPairFactoryProxy.read.getPair([USDC.address, WETH.address, false]);

    const { algebraVaultFactory, gaugeFactory, votingIncentivesFactory } = beam;
    const testIncentiveMaker = await hre.viem.deployContract("TestIncentiveMaker", [beamToken.address]);

    const createGaugeForPool = async (poolAddr: Address) => {
      await algebraVaultFactory.write.createVaultForPool([poolAddr]);
      const feeVault = await algebraVaultFactory.read.poolToVault([poolAddr]);
      await gaugeFactory.write.createEternalGauge([poolAddr, epochDistributorProxy.address, feeVault, ZERO_ADDRESS, testIncentiveMaker.address]);
      const events = await gaugeFactory.getEvents.CreateGauge();
      const gaugeAddr = events[0].args.gauge as Address;

      await votingIncentivesFactory.write.createVotingIncentives([USDC.address, beamToken.address, voter.address, gaugeAddr, claimer.address]);
      const votingIncentivesAddr = await votingIncentivesFactory.read.last_votingIncentives();
      await gaugeFactory.write.setVotingIncentives([gaugeAddr, votingIncentivesAddr]);

      await voter.write.addPoolData([poolAddr, gaugeAddr, votingIncentivesAddr]);

      return {
        feeVault,
        gaugeAddr,
        votingIncentivesAddr,
      };
    };
    await createGaugeForPool(USDC_BEAM);
    await createGaugeForPool(WETH_BEAM);
    await createGaugeForPool(WETH_USDC);

    await minterProxy.write._initialize([[], [], 0n]);
    const activePeriod = await minterProxy.read.active_period();

    const veNFTId = await create10PercentOfTotalSupplyLock(beamToken, votingEscrow);

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      testIncentiveMaker,
      activePeriod,
      veNFTId,
      USDC,
      WETH,
      ...beam,
      pools: {
        USDC_BEAM,
        WETH_BEAM,
        WETH_USDC,
      },
    };
  };

  it("Should distribute farming rewards to gauges", async () => {
    const { deployerAddress, minterProxy, activePeriod, beamToken, epochDistributorProxy, testIncentiveMaker, voter, veNFTId, pools } = await loadFixture(deployFixture);

    const votes = {
      [pools.USDC_BEAM]: 50n,
      [pools.WETH_BEAM]: 35n,
      [pools.WETH_USDC]: 15n,
    } as {[key: Address]: bigint};

    await voter.write.vote([veNFTId, Object.keys(votes) as [Address], Object.values(votes)]);

    await simulateOneWeekAndFlipEpoch(minterProxy);

    const expectedEmission = await minterProxy.read.weekly();

    expect(await beamToken.read.balanceOf([epochDistributorProxy.address])).to.equals(expectedEmission);

    const [amountEpoch0, totalWeightsEpoch0, timestampEpoch0, poolsLengthEpoch0] = await epochDistributorProxy.read.amountsPerEpoch([0n]);

    expect(amountEpoch0).to.equals(expectedEmission);
    expect(timestampEpoch0).to.equals(activePeriod);
    expect(totalWeightsEpoch0).to.equals(await voter.read.totalWeights([activePeriod]));
    expect(poolsLengthEpoch0).to.equals(3n);

    await epochDistributorProxy.write.setAutomation([deployerAddress, true]);
    await epochDistributorProxy.write.distributeAll();

    // We expect a small token lefhover in the epoch distributor because of integer division
    const lefthoverAmount = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    const distributedAmount = await beamToken.read.balanceOf([testIncentiveMaker.address]);
    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    Object.entries(votes).forEach(async ([poolAddr, vote]) => {
      expect(await testIncentiveMaker.read.poolAmount([poolAddr as Address])).to.equals(
        distributedAmount * vote / 100n
      );
    });
  });
});
