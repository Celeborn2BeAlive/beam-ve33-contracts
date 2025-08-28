import hre, { ignition } from "hardhat";
import { Address, getAddress, parseUnits, PublicClient } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork } from "./constants";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { create10PercentOfTotalSupplyLock, createGaugeForSolidlyPoolWithGlobalFactory, simulateOneWeek, simulateOneWeekAndFlipEpoch } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { EmissionTokenContract, ERC20PresetMinterPauserContract, SolidlyRouterContract } from "./types";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TestTokens = buildModule("TestTokens", (m) => {
  const USDC = m.contract("ERC20PresetMinterPauser", ["USDC", "USDC"], { id: "USDC"});
  m.call(USDC, "mint", [m.getAccount(0), 10_000_000_000n]);
  const WETH = m.contract("ERC20PresetMinterPauser", ["Wrapped Ether", "WETH"], { id: "WETH"});
  m.call(WETH, "mint", [m.getAccount(0), 42_000_000n]);

  return {
    USDC,
    WETH,
  }
});

const TestProtocol = buildModule("TestProtocol", (m) => {
  const beam = m.useModule(BeamProtocol);
  const tokens = m.useModule(TestTokens);
  return {
    ...beam,
    ...tokens,
  }
});

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

    const beam = await ignition.deploy(TestProtocol);

    const { beamToken, minterProxy, votingEscrow, USDC, WETH } = beam;

    // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
    await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
    await beamToken.write.setMinter([minterProxy.address]);

    // Set 0% emission to rebase and team to ease computation
    await minterProxy.write.setRebase([0n]);
    await minterProxy.write.setTeamRate([0n]);

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
    const { solidlyPairFactoryProxy, tokens, beamToken, globalFactory, ...others } = await loadFixture(deployFixture);
    const { USDC, WETH } = tokens;

    await solidlyPairFactoryProxy.write.createPair([USDC.address, beamToken.address, false]);
    await solidlyPairFactoryProxy.write.createPair([WETH.address, beamToken.address, false]);
    await solidlyPairFactoryProxy.write.createPair([WETH.address, USDC.address, false]);
    const USDC_BEAM = await solidlyPairFactoryProxy.read.getPair([USDC.address, beamToken.address, false]);
    const WETH_BEAM = await solidlyPairFactoryProxy.read.getPair([WETH.address, beamToken.address, false]);
    const WETH_USDC = await solidlyPairFactoryProxy.read.getPair([USDC.address, WETH.address, false]);

    await globalFactory.write.setPoolType([await globalFactory.read.POOL_TYPE_SOLIDLY(), true]);
    await globalFactory.write.addToken([[USDC.address, WETH.address]]);

    const solidlyPools = {
      USDC_BEAM: await createGaugeForSolidlyPoolWithGlobalFactory({
        poolAddr: USDC_BEAM,
        globalFactory,
      }),
      WETH_BEAM: await createGaugeForSolidlyPoolWithGlobalFactory({
        poolAddr: WETH_BEAM,
        globalFactory,
      }),
      WETH_USDC: await createGaugeForSolidlyPoolWithGlobalFactory({
        poolAddr: WETH_USDC,
        globalFactory,
      }),
    };

    return {
      solidlyPairFactoryProxy, beamToken, tokens, solidlyPools, ...others,
    }
  }

  it("Should create pool, gauge, votingIncentives and add data to Voter", async () => {
    const { voter, solidlyPools } = await loadFixture(createGaugesFixture)

    expect(await voter.read.poolsLength()).to.equals(BigInt(Object.values(solidlyPools).length));
    for (const {
        poolAddr,
        gaugeAddr,
        votingIncentivesAddr,
    } of Object.values(solidlyPools)) {
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
    solidlyPools: Record<string, {
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
    solidlyPools,
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
    for (const {poolAddr, gaugeAddr} of Object.values(solidlyPools)) {
      const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
      const pool = await hre.viem.getContractAt("ERC20", poolAddr);
      await pool.write.approve([gaugeAddr, await pool.read.balanceOf([farmerAddress])], { account: farmerAddress });
      await gauge.write.depositAll({ account: farmerAddress });
    }
  }

  type AddVotingIncentivesArgs = {
    pools: Record<string, {
      poolAddr: Address,
      votingIncentivesAddr: Address,
    }>,
    beamToken: EmissionTokenContract,
    deployerAddress: Address,
  };

  const addVotingIncentives = async ({
    pools,
    beamToken,
    deployerAddress,
  }: AddVotingIncentivesArgs) => {
    const addedIncentives = {
      [beamToken.address]: 0n
    };
    for (const {poolAddr, votingIncentivesAddr} of Object.values(pools)) {
      const votingIncentives = await hre.viem.getContractAt("VotingIncentives", votingIncentivesAddr);
      const beamRewardAmount = parseUnits("1000000", 18); // 1M BEAM tokens
      await beamToken.write.approve([votingIncentives.address, beamRewardAmount]);
      await votingIncentives.write.notifyRewardAmount([beamToken.address, beamRewardAmount]);
      addedIncentives[beamToken.address] += beamRewardAmount;
      const pairInfo = await hre.viem.getContractAt("IPairInfo", poolAddr);
      const pairTokens = [await pairInfo.read.token0(), await pairInfo.read.token1()];
      for (const tokenAddr of pairTokens) {
        if (tokenAddr == beamToken.address) continue;
        if (!(tokenAddr in addedIncentives)) {
          addedIncentives[tokenAddr] = 0n;
        }
        const token = await hre.viem.getContractAt("ERC20", tokenAddr);
        const balance = await token.read.balanceOf([deployerAddress]);
        const rewardAmount = balance * 10n / 100n; // 10% of balance
        await token.write.approve([votingIncentives.address, rewardAmount]);
        await votingIncentives.write.notifyRewardAmount([tokenAddr, rewardAmount]);
        addedIncentives[tokenAddr] += rewardAmount;
      }
    }
    return addedIncentives;
  }

  it("Should distribute farming rewards to gauges", async () => {
    const { deployerAddress, farmerAddress, publicClient, minterProxy, activePeriod, beamToken, epochDistributorProxy, voter, veNFTId, solidlyPools, tokens, solidlyRouter, claimer } = await loadFixture(createGaugesFixture);
    const { WETH, USDC } = tokens;

    await addLiquidityAndStakeForFarming({WETH, USDC, beamToken, deployerAddress, farmerAddress, solidlyRouter, publicClient, solidlyPools});

    const addedVotingIncentives = await addVotingIncentives({pools: solidlyPools, beamToken, deployerAddress});

    const votes: Record<Address, bigint> = {
      [solidlyPools.USDC_BEAM.poolAddr]: 50n,
      [solidlyPools.WETH_BEAM.poolAddr]: 35n,
      [solidlyPools.WETH_USDC.poolAddr]: 15n,
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
    for (const {poolAddr, gaugeAddr} of Object.values(solidlyPools)) {
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
    for (const {poolAddr, gaugeAddr} of Object.values(solidlyPools)) {
      const rewardAmount = poolAddrToRewardAmount[poolAddr as Address];
      const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
      const earnedAmount = await gauge.read.earned([farmerAddress, beamToken.address]);
      const delta = rewardAmount - earnedAmount;
      expect(delta < rewardAmount * 10n / 1000n).to.be.true; // 1% difference check
    }

    // Use the Claimer to claim rewards on all gauges and check the farmer gets everything
    await claimer.write.claimRewards([Object.values(solidlyPools).map(({gaugeAddr}) => gaugeAddr)], { account: farmerAddress });
    const delta = distributedAmount - await beamToken.read.balanceOf([farmerAddress]);
    expect(delta < distributedAmount * 10n / 1000n).to.be.true; // 1% difference check

    const balanceBeforeVotingIncentiveClaim = {
      [beamToken.address]: await beamToken.read.balanceOf([deployerAddress]),
      [WETH.address]: await WETH.read.balanceOf([deployerAddress]),
      [USDC.address]: await USDC.read.balanceOf([deployerAddress]),
    };

    const allTokens = [beamToken.address, WETH.address, USDC.address];
    await claimer.write.claimVotingIncentivesAddress([
      Object.values(solidlyPools).map(({votingIncentivesAddr}) => votingIncentivesAddr),
      [allTokens, allTokens, allTokens]
    ])

    const balanceAfterVotingIncentiveClaim = {
      [beamToken.address]: await beamToken.read.balanceOf([deployerAddress]),
      [WETH.address]: await WETH.read.balanceOf([deployerAddress]),
      [USDC.address]: await USDC.read.balanceOf([deployerAddress]),
    };

    for (const tokenAddr of allTokens) {
      const claimedReward = balanceAfterVotingIncentiveClaim[tokenAddr] - balanceBeforeVotingIncentiveClaim[tokenAddr];
      const delta = addedVotingIncentives[tokenAddr] - claimedReward;

      expect(delta < 100n).to.be.true; // 100 wei check
    }
  });
});
