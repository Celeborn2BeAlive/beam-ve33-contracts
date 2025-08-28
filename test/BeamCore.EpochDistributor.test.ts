import hre, { ignition } from "hardhat";
import { Address, getAddress } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, WEEK } from "./constants";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { addLiquidityAndStakeForFarming, addVotingIncentives, create10PercentOfTotalSupplyLock, createGauge, CreateGaugeResult, getPairs, getRandomVoteWeight, simulateOneWeek, simulateOneWeekAndFlipEpoch, TestTokens } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ZERO_ADDRESS } from "../ignition/modules/constants";
import { Mulberry32 } from "./random";

const TestAlgebraFactory = buildModule("TestAlgebraFactory", (m) => {
  const { beamToken } = m.useModule(BeamProtocol);
  const { USDC, WETH } = m.useModule(TestTokens);

  // Mocking Algebra DEX with TestAlgebraFactory and creating pools which are TestAlgebraPool instances
  const algebraFactory = m.contract("TestAlgebraFactory");

  m.call(algebraFactory, "createPool", [USDC, WETH], {id: "createPool_USDC_WETH"});
  m.call(algebraFactory, "createPool", [USDC, beamToken], {id: "createPool_USDC_BEAM"});
  m.call(algebraFactory, "createPool", [beamToken, WETH], {id: "createPool_BEAM_WETH"});

  return { algebraFactory };
});

const TestAlgebraEternalFarming = buildModule("TestAlgebraEternalFarming", (m) => {
  const { algebraFactory } = m.useModule(TestAlgebraFactory);

  const algebraEternalFarming = m.contract("TestAlgebraEternalFarming", [algebraFactory]);

  return { algebraEternalFarming };
});

const TestProtocol = buildModule("TestProtocol", (m) => {
  const beam = m.useModule(BeamProtocol);
  const tokens = m.useModule(TestTokens);
  const { algebraFactory } = m.useModule(TestAlgebraFactory);
  const { algebraEternalFarming } = m.useModule(TestAlgebraEternalFarming);

  const { globalFactory } = beam;
  m.call(globalFactory, "setPairFactoryAlgebra", [algebraFactory]);

  return {
    ...beam,
    ...tokens,
    algebraFactory,
    algebraEternalFarming,
  }
});

describe("BeamCore.EpochDistributor", () => {
  const deployFixture = async () => {
    const [deployer, farmer] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const farmerAddress = getAddress(farmer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(TestProtocol);

    const {
      beamToken,
      minterProxy,
      voter,
      votingEscrow,
      globalFactory,
      algebraVaultFactory,
      incentiveMakerProxy,
      algebraEternalFarming,
      USDC,
      WETH,
      algebraFactory,
      solidlyPairFactoryProxy,
    } = beam;
    const tokens = [
      USDC,
      WETH,
      beamToken,
    ]
    const allTokenAddrs = tokens.map(({address}) => address);
    const allTokenPairs = getPairs(allTokenAddrs);

    // Tokens need to be whitelisted for gauge creation:
    await globalFactory.write.addToken([allTokenAddrs]);

    const POOL_TYPE_ALGEBRA = await globalFactory.read.POOL_TYPE_ALGEBRA();
    const algebraPools = [] as CreateGaugeResult[];
    for (const [token0, token1] of allTokenPairs) {
      const poolAddr = await algebraFactory.read.poolByPair([token0, token1]);
      const pool = await hre.viem.getContractAt("TestAlgebraPool", poolAddr);

      { // Create AlgebraVault and set as communityVault for each pool
        const vaultAddr = await algebraVaultFactory.read.getVaultForPool([poolAddr]);
        if (vaultAddr == ZERO_ADDRESS) {
          await algebraVaultFactory.write.createVaultForPool([poolAddr]);
        }
      }
      const vaultAddr = await algebraVaultFactory.read.getVaultForPool([poolAddr]);
      await pool.write.setCommunityVault([vaultAddr]);

      const result = await createGauge({
        poolAddr,
        poolType: POOL_TYPE_ALGEBRA,
        voter,
        globalFactory,
      });
      algebraPools.push(result);
    }

    // Assign INCENTIVE_MAKER_ROLE to our IncentiveMaker contract instance,
    // which is required for it to be able to create Algebra Eternal Farming campaigns
    const incentiveMakerRole = await algebraEternalFarming.read.INCENTIVE_MAKER_ROLE();
    const hasIncentiveMakerRole = await algebraFactory.read.hasRole([incentiveMakerRole, incentiveMakerProxy.address]);
    if (!hasIncentiveMakerRole) {
      await algebraFactory.write.grantRole([incentiveMakerRole, incentiveMakerProxy.address], {
        account: await algebraFactory.read.owner(),
      });
    }

    // Initialize the IncentiveMaker so it's connected to Algebra farming
    if (ZERO_ADDRESS == await incentiveMakerProxy.read.algebraEternalFarming()) {
      await incentiveMakerProxy.write._initialize([algebraEternalFarming.address, voter.address]);
    }

    // Create Solidly pools and gauges
    const POOL_TYPE_SOLIDLY = await globalFactory.read.POOL_TYPE_SOLIDLY();
    await globalFactory.write.setPoolType([POOL_TYPE_SOLIDLY, true]); // type need to be enabled
    const solidlyPools = [] as CreateGaugeResult[];
    for (const [token0, token1] of allTokenPairs) {
      const pairId = [token0, token1, false] as [Address, Address, boolean];
      if (ZERO_ADDRESS == await solidlyPairFactoryProxy.read.getPair(pairId)) {
        await solidlyPairFactoryProxy.write.createPair(pairId);
      }
      const poolAddr = await solidlyPairFactoryProxy.read.getPair(pairId);
      const result = await createGauge({
        poolAddr,
        poolType: POOL_TYPE_SOLIDLY,
        voter,
        globalFactory,
      });
      solidlyPools.push(result);
    }

    if (await beamToken.read.minter() != minterProxy.address) {
      // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
      await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
      await beamToken.write.setMinter([minterProxy.address]);

      // Set 0% emission to rebase and team to ease computation
      await minterProxy.write.setRebase([0n]);
      await minterProxy.write.setTeamRate([0n]);

      await minterProxy.write._initialize();

      await create10PercentOfTotalSupplyLock(beamToken, votingEscrow);
    }
    const veNFTId = await votingEscrow.read.tokenOfOwnerByIndex([deployerAddress, 0n]);
    const activePeriod = await minterProxy.read.active_period();

    const rng = new Mulberry32(42);

    return {
      publicClient,
      deployer,
      farmer,
      deployerAddress,
      farmerAddress,
      activePeriod,
      veNFTId,
      ...beam,
      algebraPools,
      solidlyPools,
      rng,
      tokens,
    };
  };

  it("Should distribute farming rewards to gauges", async () => {
    const {
      deployerAddress,
      farmerAddress,
      minterProxy,
      activePeriod,
      beamToken,
      claimer,
      epochDistributorProxy,
      algebraEternalFarming,
      voter,
      veNFTId,
      algebraPools,
      solidlyPools,
      incentiveMakerProxy,
      rng,
      solidlyRouter,
      publicClient,
      tokens,
    } = await loadFixture(deployFixture);

    // Utility function to get a map of all token balances for a given address
    const getTokenBalances = async (holder: Address) => {
      return Object.fromEntries(
        await Promise.all(tokens.map(async (token) => [token.address, await token.read.balanceOf([holder])] as [Address, bigint]))
      );
    }
    const allPools = [...solidlyPools, ...algebraPools];
    const allPoolAddrs = [...algebraPools.map(({poolAddr}) => poolAddr), ...solidlyPools.map(({poolAddr}) => poolAddr)];
    const allTokenAddrs = tokens.map(({address}) => address);

    await addLiquidityAndStakeForFarming({deployerAddress, farmerAddress, solidlyRouter, publicClient, solidlyPools});
    const addedVotingIncentives = await addVotingIncentives({pools: allPools, beamToken, deployerAddress});
    const epochStart = await minterProxy.read.active_period();

    // Cast random votes

    const votes: Record<Address, bigint> = Object.fromEntries(
      allPoolAddrs.map(poolAddr => [poolAddr, getRandomVoteWeight(rng)])
    );
    const voteCount = Object.keys(votes).length;
    const voteSum = Object.values(votes).reduce((accum, value) => accum + value, 0n);

    await voter.write.vote([veNFTId, Object.keys(votes) as [Address], Object.values(votes)]);

    const balanceOfDistributorBeforeEpochFlip = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    if (balanceOfDistributorBeforeEpochFlip > 0n) {
      await epochDistributorProxy.write.emergencyRecoverERC20([beamToken.address, balanceOfDistributorBeforeEpochFlip]);
      expect(await beamToken.read.balanceOf([epochDistributorProxy.address])).to.equals(0n);
    }

    await simulateOneWeekAndFlipEpoch(minterProxy);

    const expectedEmission = await minterProxy.read.weekly();

    // All token goes to epochDistributor because we set teamRate and rebaseRate to 0 at deploy time
    const balanceOfDistributorAfterEpochFlip = await beamToken.read.balanceOf([epochDistributorProxy.address]);

    expect(balanceOfDistributorAfterEpochFlip).to.equals(expectedEmission);

    const currentEpoch = await epochDistributorProxy.read.currentEpoch();
    const [amountEpoch0, totalWeightsEpoch0, timestampEpoch0, poolsLengthEpoch0] = await epochDistributorProxy.read.amountsPerEpoch([currentEpoch]);

    expect(amountEpoch0).to.equals(expectedEmission);
    expect(timestampEpoch0).to.equals(activePeriod);
    expect(totalWeightsEpoch0).to.equals(await voter.read.totalWeights([activePeriod]));
    expect(poolsLengthEpoch0).to.equals(await voter.read.poolsLength());

    const algebraEternalFarmingRewardAmountBeforeDistribute = await beamToken.read.balanceOf([algebraEternalFarming.address]);
    const gaugesRewardAmountBeforeDistribute = Object.fromEntries(await Promise.all(
      solidlyPools.map(async ({gaugeAddr}) => [gaugeAddr, await beamToken.read.balanceOf([gaugeAddr])])
    ));

    await epochDistributorProxy.write.setAutomation([deployerAddress, true]);
    await epochDistributorProxy.write.distributeAll();

    // We expect a small token lefhover in the epoch distributor because of integer division
    const lefthoverAmount = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    const algebraEternalFarmingRewardAmountAfterDistribute = await beamToken.read.balanceOf([algebraEternalFarming.address]);
    const algebraEternalFarmingDistributedAmount = algebraEternalFarmingRewardAmountAfterDistribute - algebraEternalFarmingRewardAmountBeforeDistribute;

    let solidlyGaugesDistributedAmount = 0n;
    let solidlyGaugesRewardAddedEventCount = 0;
    const poolAddrToRewardAmount: Record<Address, bigint> = {}
    for (const {poolAddr, gaugeAddr} of solidlyPools) {
      const rewardAmountAfterDistribute = await beamToken.read.balanceOf([gaugeAddr]);
      const rewardAmount = rewardAmountAfterDistribute - gaugesRewardAmountBeforeDistribute[gaugeAddr];
      solidlyGaugesDistributedAmount += rewardAmount
      poolAddrToRewardAmount[poolAddr] = rewardAmount;

      // Rewards have just been distributed to gauges so we expect 0 farming for now
      const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
      const rewardAddedEvents = await gauge.getEvents.RewardAdded();
      expect(rewardAddedEvents.length).to.equals(1);
      expect(rewardAddedEvents[0].args.token).to.equals(beamToken.address);
      expect(rewardAddedEvents[0].args.reward).to.equals(rewardAmount);
      solidlyGaugesRewardAddedEventCount += 1;
    }

    const distributedAmount = algebraEternalFarmingDistributedAmount + solidlyGaugesDistributedAmount;

    expect(distributedAmount > 0n).to.be.true;
    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    // Check amount of rewards distributed to Algebra pools Gauges
    const rewardsAddedEvents = await algebraEternalFarming.getEvents.RewardsAdded();
    expect(rewardsAddedEvents.length + solidlyGaugesRewardAddedEventCount).to.equals(voteCount);

    const virtualPoolAddrToEvent: Record<Address, typeof rewardsAddedEvents[0]> = {};
    for (const rewardAdded of rewardsAddedEvents) {
      const incentive = await algebraEternalFarming.read.incentives([rewardAdded.args.incentiveId as `0x${string}`]);
      const virtualPoolAddr = incentive[2];
      virtualPoolAddrToEvent[virtualPoolAddr] = rewardAdded;
      expect(rewardAdded.args.bonusRewardAmount).to.equals(0n); // We don't distribute bonus rewards, only BEAM
    }

    for (const {poolAddr} of algebraPools) {
      const vote = votes[poolAddr];
      const virtualPoolAddr = await incentiveMakerProxy.read.poolToVirtualPool([poolAddr as Address]);
      const rewardAdded = virtualPoolAddrToEvent[virtualPoolAddr];
      const rewardAmount = rewardAdded.args.rewardAmount as bigint;
      const expectedRewardAmount = distributedAmount * vote / voteSum;
      const delta = (rewardAmount >= expectedRewardAmount) ? rewardAmount - expectedRewardAmount : expectedRewardAmount - rewardAmount;
      expect(delta < 10n).to.be.true; // 10 wei delta check
    }

    // Check amount of rewards distributed to Solidly pools Gauges
    for (const {poolAddr} of solidlyPools) {
      const vote = votes[poolAddr];
      const rewardAmount = poolAddrToRewardAmount[poolAddr as Address];
      const expectedRewardAmount = distributedAmount * vote / voteSum;
      const delta = (rewardAmount >= expectedRewardAmount) ? rewardAmount - expectedRewardAmount : expectedRewardAmount - rewardAmount;
      expect(delta < 10n).to.be.true; // 10 wei delta check
    }

    // Check distribution of voting rewards according to votes
    for (const {poolAddr, votingIncentivesAddr} of allPools) {
      const votingIncentives = await hre.viem.getContractAt("VotingIncentives", votingIncentivesAddr);
      const balanceBeforeVotingIncentiveClaim = await getTokenBalances(deployerAddress);
      await claimer.write.claimVotingIncentivesAddress([
        [votingIncentivesAddr],
        [allTokenAddrs, allTokenAddrs, allTokenAddrs]
      ]);
      const balanceAfterVotingIncentiveClaim = await getTokenBalances(deployerAddress);
      for (const tokenAddr of allTokenAddrs) {
        const claimedReward = balanceAfterVotingIncentiveClaim[tokenAddr] - balanceBeforeVotingIncentiveClaim[tokenAddr];
        if (!(tokenAddr in addedVotingIncentives[poolAddr])) {
          expect(claimedReward).to.equals(0n);
          continue;
        }
        const totalVotingRewards = addedVotingIncentives[poolAddr][tokenAddr].incentivesAmount + addedVotingIncentives[poolAddr][tokenAddr].feesAmount;
        const delta = totalVotingRewards - claimedReward;
        expect(delta < 100n).to.be.true; // 100 wei check

        const [periodFinish, incentivesAmount, feesAmount, rewardsPerEpoch, lastUpdateTime] = await votingIncentives.read.rewardData([tokenAddr, epochStart]);
        expect(periodFinish).to.equals(epochStart + WEEK - 1n);
        expect(incentivesAmount).to.equals(addedVotingIncentives[poolAddr][tokenAddr].incentivesAmount);
        expect(feesAmount).to.equals(addedVotingIncentives[poolAddr][tokenAddr].feesAmount);
        expect(rewardsPerEpoch).to.equals(totalVotingRewards);
        expect(lastUpdateTime >= epochStart).to.be.true;
      }
    }

    // Check farming of Solidly gauges

    // Claim already accumulated rewards first
    await claimer.write.claimRewards([solidlyPools.map(({gaugeAddr}) => gaugeAddr)], { account: farmerAddress });

    await simulateOneWeek((await publicClient.getBlock()).timestamp); // After a week almost all rewards should have been farmed
    await mine();

    // Use the Claimer to claim rewards on all gauges and check the farmer gets everything
    await claimer.write.claimRewards([solidlyPools.map(({gaugeAddr}) => gaugeAddr)], { account: farmerAddress });
    const delta = solidlyGaugesDistributedAmount - await beamToken.read.balanceOf([farmerAddress]);
    expect(delta < solidlyGaugesDistributedAmount * 10n / 1000n).to.be.true; // 1% difference check
  });
});
