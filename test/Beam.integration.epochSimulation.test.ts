import hre, { ignition } from "hardhat";
import { Address, getAddress } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, WEEK } from "./constants";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { addLiquidityAndStakeForFarming, addVotingIncentives, createGauge, CreateGaugeResult, createRandomLockFor, getDiff, getPairs, getRandomVoteWeight, simulateOneWeek, simulateOneWeekAndFlipEpoch, TestTokens } from "./utils";
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

// This large test integrates all components together and simulates a full epoch with
// voter users, farmer user.
// It can be executed several times in a persistent environment where the protocol is
// deployed on the first run, and next runs simulate new epochs.
describe("BeamCore.integration.epochSimulation", () => {
  const deployFixture = async () => {
    const allAccounts = await hre.viem.getWalletClients()
    const deployer = allAccounts[0];
    const deployerAddress = getAddress(deployer.account.address);
    const farmer = allAccounts[1];
    const farmerAddress = getAddress(farmer.account.address);

    const voterUsers = allAccounts.slice(2, 8); // 6 voter users

    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(TestProtocol);

    const {
      beamToken,
      minterProxy,
      voter,
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

    const isMinterInitialized = await beamToken.read.minter() == minterProxy.address;
    if (!isMinterInitialized) {
      // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
      await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
      await beamToken.write.setMinter([minterProxy.address]);

      // Set 0% emission to rebase and team to ease computation
      await minterProxy.write.setRebase([0n]);
      await minterProxy.write.setTeamRate([0n]);

      await minterProxy.write._initialize();
    }

    // Use constant seed the first run, then random seed to change the simulation
    const rngSeed = isMinterInitialized ? (new Date()).getTime() : 42;
    const rng = new Mulberry32(rngSeed);

    return {
      publicClient,
      deployer,
      farmer,
      deployerAddress,
      farmerAddress,
      ...beam,
      algebraPools,
      solidlyPools,
      rng,
      tokens,
      voterUsers,
    };
  };

  it("Should distribute farming rewards to gauges", async () => {
    const {
      deployerAddress,
      farmerAddress,
      minterProxy,
      beamToken,
      claimer,
      epochDistributorProxy,
      algebraEternalFarming,
      voter,
      algebraPools,
      solidlyPools,
      incentiveMakerProxy,
      rng,
      solidlyRouter,
      publicClient,
      tokens,
      votingEscrow,
      voterUsers,
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

    if (await minterProxy.read.check_update_period()) {
      await minterProxy.write.update_period();
    }
    const activePeriod = await minterProxy.read.active_period();

    await addLiquidityAndStakeForFarming({deployerAddress, farmerAddress, solidlyRouter, publicClient, solidlyPools});
    const addedVotingIncentives = await addVotingIncentives({pools: allPools, beamToken, deployerAddress});
    const epochStart = await minterProxy.read.active_period();

    // Generate random veNFTs for voter users and cast random votes
    const totalVoteDepositPerPool: Record<Address, bigint> = Object.fromEntries(
      allPoolAddrs.map(poolAddr => [poolAddr, 0n])
    );
    const totalVoteDepositPerUserPerPool: Record<Address, Record<Address, bigint>> = {};
    const randomPoolExcluded = allPoolAddrs[rng.nextInt(0, allPoolAddrs.length)]
    for (const voterUser of voterUsers) {
      totalVoteDepositPerUserPerPool[voterUser.account.address] = Object.fromEntries(
        allPoolAddrs.map(poolAddr => [poolAddr, 0n])
      );
      const veNFTCount = rng.nextInt(1, 5);
      for (let veNFTIdx = 0; veNFTIdx < veNFTCount; ++veNFTIdx) {
        const veNFTId = await createRandomLockFor({
          beamToken,
          votingEscrow,
          maxPercentOfBalance: 5, // 5% max of deployer balance to lock
          depositor: deployerAddress,
          recipient: voterUser.account.address,
          rng,
        });

        const weights: Record<Address, bigint> = Object.fromEntries(
          allPoolAddrs.map(poolAddr => [poolAddr, getRandomVoteWeight(rng)])
        );
        weights[randomPoolExcluded] = 0n; // Remove vote for one pool to check one with zero vote don't mess up the protocol
        const weightsSum = Object.values(weights).reduce((accum, value) => accum + value, 0n);

        const votingPower = await votingEscrow.read.balanceOfNFT([veNFTId]);
        // voter.vote() reverts on zero weights:
        const weightsForVoteCall = Object.fromEntries(
          allPoolAddrs.filter(poolAddr => weights[poolAddr] > 0n).map(poolAddr => [poolAddr, weights[poolAddr]])
        );
        await voter.write.vote([
          veNFTId,
          Object.keys(weightsForVoteCall) as [Address],
          Object.values(weightsForVoteCall)
        ], { account: voterUser.account });

        for (const { poolAddr, votingIncentivesAddr } of allPools) {
          const votingPowerForPool = votingPower * weights[poolAddr] / weightsSum;
          totalVoteDepositPerUserPerPool[voterUser.account.address][poolAddr] += votingPowerForPool
          totalVoteDepositPerPool[poolAddr] += votingPowerForPool;
          const votingIncentives = await hre.viem.getContractAt("VotingIncentives", votingIncentivesAddr);
          const votingPowerBalance = await votingIncentives.read.balanceOfOwner([voterUser.account.address]);
          const delta = getDiff(votingPowerBalance, totalVoteDepositPerUserPerPool[voterUser.account.address][poolAddr]);
          expect(delta <= votingPowerForPool * 10n / 10_000n).to.be.true; // 0.1% diff check
        }
      }
    }
    const poolWithVotesCount = allPoolAddrs.filter(poolAddr => totalVoteDepositPerPool[poolAddr] > 0n).length;
    const voteSum = Object.values(totalVoteDepositPerPool).reduce((accum, value) => accum + value, 0n);

    // Claim all voter rewards that may be left from previous runs in persistent environment, in order to isolate rewards of this epoch
    for (const voterUser of voterUsers) {
      for (const {votingIncentivesAddr} of allPools) {
        await claimer.write.claimVotingIncentivesAddress([
          [votingIncentivesAddr],
          [allTokenAddrs, allTokenAddrs, allTokenAddrs],
        ], {account: voterUser.account});
      }
    }

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

      if (rewardAmount == 0n) {
        expect(totalVoteDepositPerPool[poolAddr]).to.equals(0n);
        continue;
      }

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
    expect(lefthoverAmount < distributedAmount * 10n / 10_000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    // Check amount of rewards distributed to Algebra pools Gauges
    const rewardsAddedEvents = await algebraEternalFarming.getEvents.RewardsAdded();
    expect(rewardsAddedEvents.length + solidlyGaugesRewardAddedEventCount).to.equals(poolWithVotesCount);

    const virtualPoolAddrToEvent: Record<Address, typeof rewardsAddedEvents[0]> = {};
    for (const rewardAdded of rewardsAddedEvents) {
      const incentive = await algebraEternalFarming.read.incentives([rewardAdded.args.incentiveId as `0x${string}`]);
      const virtualPoolAddr = incentive[2];
      virtualPoolAddrToEvent[virtualPoolAddr] = rewardAdded;
      expect(rewardAdded.args.bonusRewardAmount).to.equals(0n); // We don't distribute bonus rewards, only BEAM
    }

    for (const {poolAddr} of algebraPools) {
      const vote = totalVoteDepositPerPool[poolAddr];
      const virtualPoolAddr = await incentiveMakerProxy.read.poolToVirtualPool([poolAddr as Address]);
      if (!(virtualPoolAddr in virtualPoolAddrToEvent)) {
        expect(vote).to.equals(0n);
        continue;
      }

      const rewardAdded = virtualPoolAddrToEvent[virtualPoolAddr];
      const rewardAmount = rewardAdded.args.rewardAmount as bigint;
      const expectedRewardAmount = distributedAmount * vote / voteSum;
      const delta = getDiff(rewardAmount, expectedRewardAmount);
      expect(delta <= rewardAmount * 10n / 10_000n).to.be.true; // 0.1% diff
    }

    // Check amount of rewards distributed to Solidly pools Gauges
    for (const {poolAddr} of solidlyPools) {
      const vote = totalVoteDepositPerPool[poolAddr];
      const rewardAmount = poolAddrToRewardAmount[poolAddr as Address];
      const expectedRewardAmount = distributedAmount * vote / voteSum;
      const delta = getDiff(rewardAmount, expectedRewardAmount);
      expect(delta <= rewardAmount * 10n / 10_000n).to.be.true; // 0.1% diff
    }

    // Check distribution of voting rewards according to votes
    for (const {poolAddr, votingIncentivesAddr} of allPools) {
      const votingIncentives = await hre.viem.getContractAt("VotingIncentives", votingIncentivesAddr);
      for (const tokenAddr of allTokenAddrs) {
        const [periodFinish, incentivesAmount, feesAmount, rewardsPerEpoch, lastUpdateTime] = await votingIncentives.read.rewardData([tokenAddr, epochStart]);
        if (!(tokenAddr in addedVotingIncentives[poolAddr])) {
          expect(incentivesAmount).to.equals(0n);
          expect(feesAmount).to.equals(0n);
          expect(rewardsPerEpoch).to.equals(0n);
          continue;
        }

        const totalVotingRewards = addedVotingIncentives[poolAddr][tokenAddr].incentivesAmount + addedVotingIncentives[poolAddr][tokenAddr].feesAmount;
        expect(periodFinish).to.equals(epochStart + WEEK - 1n);
        expect(incentivesAmount).to.equals(addedVotingIncentives[poolAddr][tokenAddr].incentivesAmount);
        expect(feesAmount).to.equals(addedVotingIncentives[poolAddr][tokenAddr].feesAmount);
        expect(rewardsPerEpoch).to.equals(totalVotingRewards);
        expect(lastUpdateTime >= epochStart).to.be.true;
      }
    }

    for (const voterUser of voterUsers) {
      for (const {poolAddr, votingIncentivesAddr} of allPools) {
        const balanceBeforeVotingIncentiveClaim = await getTokenBalances(voterUser.account.address);
        await claimer.write.claimVotingIncentivesAddress([
          [votingIncentivesAddr],
          [allTokenAddrs, allTokenAddrs, allTokenAddrs],
        ], {account: voterUser.account});
        const balanceAfterVotingIncentiveClaim = await getTokenBalances(voterUser.account.address);
        for (const tokenAddr of allTokenAddrs) {
          const claimedReward = balanceAfterVotingIncentiveClaim[tokenAddr] - balanceBeforeVotingIncentiveClaim[tokenAddr];
          if (!(tokenAddr in addedVotingIncentives[poolAddr])) {
            expect(claimedReward).to.equals(0n);
            continue;
          }
          if (totalVoteDepositPerPool[poolAddr] == 0n) {
            expect(claimedReward).to.equals(0n);
            continue;
          }
          const totalVotingRewards = addedVotingIncentives[poolAddr][tokenAddr].incentivesAmount + addedVotingIncentives[poolAddr][tokenAddr].feesAmount;
          const totalVotingRewardsForVote = totalVotingRewards * totalVoteDepositPerUserPerPool[voterUser.account.address][poolAddr] / totalVoteDepositPerPool[poolAddr];
          const delta = getDiff(totalVotingRewardsForVote, claimedReward);
          expect(delta <= totalVotingRewardsForVote * 10n / 10_000n).to.be.true; // 0.1% diff
        }
      }
    }

    // Check farming of Solidly gauges

    // Claim already accumulated rewards first, that may be left from previous runs in persistent environment, in order to isolate rewards of this epoch
    await claimer.write.claimRewards([solidlyPools.map(({gaugeAddr}) => gaugeAddr)], { account: farmerAddress });

    await simulateOneWeek((await publicClient.getBlock()).timestamp); // After a week almost all rewards should have been farmed
    await mine();

    // Use the Claimer to claim rewards on all gauges and check the farmer gets everything
    await claimer.write.claimRewards([solidlyPools.map(({gaugeAddr}) => gaugeAddr)], { account: farmerAddress });
    const delta = solidlyGaugesDistributedAmount - await beamToken.read.balanceOf([farmerAddress]);
    expect(delta < solidlyGaugesDistributedAmount * 10n / 10_000n).to.be.true; // 0.1% difference check
  });
});
