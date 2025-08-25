import hre, { ignition } from "hardhat";
import { Address, getAddress, PublicClient } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork } from "./constants";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { create10PercentOfTotalSupplyLock, createGaugeForSolidlyPoolWithoutGlobalFactory, simulateOneWeek, simulateOneWeekAndFlipEpoch } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { EmissionTokenContract, ERC20Contract, ERC20PresetMinterPauserContract, SolidlyRouterContract } from "./types";

describe("BeamCore.EpochDistributorWithPairsFromSolidlyDEX", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, farmer] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const farmerAddress = getAddress(farmer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(BeamProtocol);

    const { beamToken, minterProxy, votingEscrow } = beam;

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

    await minterProxy.write._initialize();
    const activePeriod = await minterProxy.read.active_period();

    const veNFTId = await create10PercentOfTotalSupplyLock(beamToken, votingEscrow);

    return {
      publicClient,
      deployer,
      farmer,
      deployerAddress,
      farmerAddress,
      activePeriod,
      veNFTId,
      tokens: {
        USDC,
        WETH,
      },
      ...beam,
    };
  };

  const createGaugesFixture = async () => {
    const { solidlyPairFactoryProxy, tokens, beamToken, gaugeFactory, votingIncentivesFactory, epochDistributorProxy, voter, claimer, ...others } = await loadFixture(deployFixture);
    const { USDC, WETH } = tokens;

    await solidlyPairFactoryProxy.write.createPair([USDC.address, beamToken.address, false]);
    await solidlyPairFactoryProxy.write.createPair([WETH.address, beamToken.address, false]);
    await solidlyPairFactoryProxy.write.createPair([WETH.address, USDC.address, false]);
    const USDC_BEAM = await solidlyPairFactoryProxy.read.getPair([USDC.address, beamToken.address, false]);
    const WETH_BEAM = await solidlyPairFactoryProxy.read.getPair([WETH.address, beamToken.address, false]);
    const WETH_USDC = await solidlyPairFactoryProxy.read.getPair([USDC.address, WETH.address, false]);

    const commonArgs = {
      gaugeFactory,
      epochDistributor: epochDistributorProxy,
      claimer,
      votingIncentivesFactory,
      voter,
      beamToken,
    }
    const pools = {
      USDC_BEAM: await createGaugeForSolidlyPoolWithoutGlobalFactory({
        poolAddr: USDC_BEAM,
        ...commonArgs,
      }),
      WETH_BEAM: await createGaugeForSolidlyPoolWithoutGlobalFactory({
        poolAddr: WETH_BEAM,
        ...commonArgs,
      }),
      WETH_USDC: await createGaugeForSolidlyPoolWithoutGlobalFactory({
        poolAddr: WETH_USDC,
        ...commonArgs,
      }),
    };

    return {
      solidlyPairFactoryProxy, beamToken, gaugeFactory, votingIncentivesFactory, epochDistributorProxy, voter, claimer, tokens, pools, ...others,
    }
  }

  it("Should create pool, gauge, votingIncentives and add data to Voter", async () => {
    const { voter, pools } = await loadFixture(createGaugesFixture)

    expect(await voter.read.poolsLength()).to.equals(BigInt(Object.values(pools).length));
    for (const {
        poolAddr,
        gaugeAddr,
        votingIncentivesAddr,
    } of Object.values(pools)) {
      expect(await voter.read.isPool([poolAddr])).to.be.true;
      const poolData = await voter.read.poolData([poolAddr]);
      expect(poolData.gauge).to.equals(gaugeAddr);
      expect(poolData.votingIncentives).to.equals(votingIncentivesAddr);
      expect(await voter.read.poolTotalWeights([poolAddr, await voter.read.epochTimestamp()])).to.equals(0n);
    }
  });

  type AddLiquidityAndStakeForFarmingArgs = {
    WETH: ERC20PresetMinterPauserContract,
    USDC: ERC20PresetMinterPauserContract,
    beamToken: EmissionTokenContract,
    deployerAddress: Address,
    farmerAddress: Address,
    solidlyRouter: SolidlyRouterContract,
    publicClient: PublicClient,
    pools: Record<string, {
      poolAddr: Address,
      gaugeAddr: Address,
    }>
  };

  const addLiquidityAndStakeForFarming = async ({
    WETH,
    USDC,
    beamToken,
    deployerAddress,
    farmerAddress,
    solidlyRouter,
    publicClient,
    pools,
  }: AddLiquidityAndStakeForFarmingArgs) => {
    const beamBalance = await beamToken.read.balanceOf([deployerAddress]);
    const wethBalance = await WETH.read.balanceOf([deployerAddress]);
    const usdcBalance = await USDC.read.balanceOf([deployerAddress]);
    await beamToken.write.approve([solidlyRouter.address, beamBalance]);
    await WETH.write.approve([solidlyRouter.address, wethBalance]);
    await USDC.write.approve([solidlyRouter.address, usdcBalance]);
    const timestamp = (await publicClient.getBlock()).timestamp;
    await solidlyRouter.write.addLiquidity([
      WETH.address, USDC.address, false, wethBalance * 10n / 100n, usdcBalance * 10n / 100n, 0n, 0n, farmerAddress, timestamp + 1000n,
    ]);
    await solidlyRouter.write.addLiquidity([
      WETH.address, beamToken.address, false, wethBalance * 10n / 100n, beamBalance * 10n / 100n, 0n, 0n, farmerAddress, timestamp + 1000n,
    ]);
    await solidlyRouter.write.addLiquidity([
      USDC.address, beamToken.address, false, usdcBalance * 10n / 100n, beamBalance * 10n / 100n, 0n, 0n, farmerAddress, timestamp + 1000n,
    ]);
    for (const {poolAddr, gaugeAddr} of Object.values(pools)) {
      const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
      const pool = await hre.viem.getContractAt("ERC20", poolAddr);
      await pool.write.approve([gaugeAddr, await pool.read.balanceOf([farmerAddress])], { account: farmerAddress });
      await gauge.write.depositAll({ account: farmerAddress });
    }
  }

  it("Should distribute farming rewards to gauges", async () => {
    const { deployerAddress, farmerAddress, publicClient, minterProxy, activePeriod, beamToken, epochDistributorProxy, voter, veNFTId, pools, tokens, solidlyRouter, claimer } = await loadFixture(createGaugesFixture);
    const { WETH, USDC } = tokens;

    await addLiquidityAndStakeForFarming({WETH, USDC, beamToken, deployerAddress, farmerAddress, solidlyRouter, publicClient, pools});

    const votes: Record<Address, bigint> = {
      [pools.USDC_BEAM.poolAddr]: 50n,
      [pools.WETH_BEAM.poolAddr]: 35n,
      [pools.WETH_USDC.poolAddr]: 15n,
    };

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

    let distributedAmount = 0n;
    const poolAddrToRewardAmount: Record<Address, bigint> = {}
    for (const {poolAddr, gaugeAddr, ..._} of Object.values(pools)) {
      const rewardAmount = await beamToken.read.balanceOf([gaugeAddr]);
      distributedAmount += rewardAmount
      poolAddrToRewardAmount[poolAddr] = rewardAmount;

      // Rewards have just been distributed to gauges so we expect 0 farming for now
      const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
      expect(await gauge.read.earned([farmerAddress, beamToken.address])).to.equals(0n);
    }
    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    for (const [poolAddr, vote] of Object.entries(votes)) {
      const rewardAmount = poolAddrToRewardAmount[poolAddr as Address];
      const expectedRewardAmount = distributedAmount * vote / 100n;
      const delta = (rewardAmount >= expectedRewardAmount) ? rewardAmount - expectedRewardAmount : expectedRewardAmount - rewardAmount;
      expect(delta < 10n).to.be.true; // 10 wei delta check
    }

    await simulateOneWeek((await publicClient.getBlock()).timestamp);
    await mine();

    // After a week all rewards should have been farmed
    for (const {poolAddr, gaugeAddr} of Object.values(pools)) {
      const rewardAmount = poolAddrToRewardAmount[poolAddr as Address];
      const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
      const earnedAmount = await gauge.read.earned([farmerAddress, beamToken.address]);
      const delta = rewardAmount - earnedAmount;
      expect(delta < rewardAmount * 10n / 1000n).to.be.true; // 1% difference check
    }

    // Use the Claimer to claim rewards on all gauges and check the farmer gets everything
    await claimer.write.claimRewards([Object.values(pools).map(({gaugeAddr}) => gaugeAddr)], { account: farmerAddress });
    const delta = distributedAmount - await beamToken.read.balanceOf([farmerAddress]);
    expect(delta < distributedAmount * 10n / 1000n).to.be.true; // 1% difference check
  });
});
