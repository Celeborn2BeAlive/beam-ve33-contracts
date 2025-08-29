import hre from "hardhat";
import { impersonateAccount, setBalance, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { WEEK } from "./constants";
import { ClaimerContract, EmissionTokenContract, EpochDistributorContract, ERC20PresetMinterPauserContract, GaugeFactoryContract, GlobalFactoryContract, MinterContract, SolidlyRouterContract, VoterContract, VotingEscrowContract, VotingIncentivesFactoryContract } from "./types";
import { Address, getAddress, parseEther, parseUnits, PublicClient } from "viem";
import { ZERO_ADDRESS } from "../ignition/modules/constants";
import { expect } from "chai";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { Mulberry32 } from "./random";

export const getDiff = (amount0: bigint, amount1: bigint) => {
  return (amount0 >= amount1) ? amount0 - amount1 : amount1 - amount0;
}

export const simulateOneWeek = async (activePeriod: bigint) => {
  const nextPeriod = activePeriod + WEEK;
  await time.setNextBlockTimestamp(activePeriod + WEEK);
  return { nextPeriod };
};

export const simulateOneWeekAndFlipEpoch = async (minter: MinterContract) => {
  const publicClient = await hre.viem.getPublicClient();
  const timestamp = (await publicClient.getBlock()).timestamp;
  const activePeriod = await minter.read.active_period();
  if (timestamp < activePeriod + WEEK) {
    await simulateOneWeek(activePeriod);
  }
  await minter.write.update_period();
  return { nextPeriod: await minter.read.active_period() };
}

export const create10PercentOfTotalSupplyLock = async (
  beamToken: EmissionTokenContract,
  votingEscrow: VotingEscrowContract,
) => {
  // Lock 10% of total supply
  const totalSupply = await beamToken.read.totalSupply();
  const depositAmount = totalSupply / 10n;
  await beamToken.write.approve([votingEscrow.address, depositAmount]);
  await votingEscrow.write.create_lock([depositAmount, await votingEscrow.read.MAXTIME()]);
  const events = await votingEscrow.getEvents.Transfer();
  return events[0].args.tokenId as bigint;
};

export type CreateRandomLockForArgs = {
  beamToken: EmissionTokenContract,
  votingEscrow: VotingEscrowContract,
  depositor: Address,
  recipient: Address,
  maxPercentOfBalance: number,
  rng: Mulberry32,
}

export const createRandomLockFor = async ({
  beamToken,
  votingEscrow,
  maxPercentOfBalance,
  depositor,
  recipient,
  rng,
}: CreateRandomLockForArgs) => {
  expect(maxPercentOfBalance <= 100).to.be.true;
  const balance = await beamToken.read.balanceOf([depositor]);
  const ratio = rng.nextFloat(0.1, maxPercentOfBalance) / 100;
  const lockAmount = balance * BigInt(Math.ceil(ratio * 1000)) / 1000n;
  await beamToken.write.approve([votingEscrow.address, lockAmount], { account: depositor });
  await votingEscrow.write.create_lock_for([lockAmount, await votingEscrow.read.MAXTIME(), recipient], { account: depositor });
  const events = await votingEscrow.getEvents.Transfer();
  return events[0].args.tokenId as bigint;
}

export type CreateGaugeResult = {
  poolAddr: Address,
  gaugeAddr: Address,
  votingIncentivesAddr: Address,
};

export type CreateGaugeArgs = {
  poolAddr: Address,
  poolType: number;
  voter: VoterContract,
  globalFactory: GlobalFactoryContract,
};

// Implement standard workflow of creating a Gauge for a pool using the GlobalFactory
// This is how it should be done in production.
// The creation of gauges for Solidly pools is permissionless, all others are permissioned with role that the caller must have.
// - poolType should be enabled on the GlobalFactory using globalFactory.setPoolType before calling the function
// - tokens of the pool should be whitelisted on the GlobalFactory using globalFactory.addToken
// Note: Beam protocol will only use Algebra pool type at deployment time.
export const createGauge = async (
  {
    poolAddr,
    poolType,
    voter,
    globalFactory,
  }: CreateGaugeArgs
): Promise<CreateGaugeResult> => {
  if (await voter.read.isPool([poolAddr])) {
    const { gauge, votingIncentives } = await voter.read.poolData([poolAddr]);
    return {
      poolAddr,
      gaugeAddr: gauge,
      votingIncentivesAddr: votingIncentives,
    }
  }
  await globalFactory.write.create([poolAddr, poolType]);
  const createEvents = await globalFactory.getEvents.Create();
  expect(createEvents).to.have.length(1);
  const {} = createEvents[0].args;
  return {
    poolAddr,
    gaugeAddr: getAddress(createEvents[0].args.gauge as Address),
    votingIncentivesAddr: getAddress(createEvents[0].args.votingIncentives as Address),
  }
};

export type CreateGaugeForPoolWithoutGlobalFactoryArgs = {
  poolAddr: Address,
  gaugeFactory: GaugeFactoryContract,
  epochDistributor: EpochDistributorContract,
  claimer: ClaimerContract,
  votingIncentivesFactory: VotingIncentivesFactoryContract,
  voter: VoterContract,
  beamToken: EmissionTokenContract,
}

// Demonstrate how gauges can be created without the GlobalFactory, but it won't be used in production.
// This code is useful to show the workflow executed under the hood, it's basically replicating what the
// GlobalFactory does in contract code.
// A way to prevent this workflow to be executed without the GlobalFactory is to revoke creation roles
// from the deployer address on GaugeFactory and VotingIncentivesFactory.
export const createGaugeForSolidlyPoolWithoutGlobalFactory = async (
  {
    poolAddr,
    gaugeFactory,
    epochDistributor,
    claimer,
    votingIncentivesFactory,
    voter,
    beamToken,
  }: CreateGaugeForPoolWithoutGlobalFactoryArgs
): Promise<CreateGaugeResult> => {
  const pairInfo = await hre.viem.getContractAt("IPairInfo", poolAddr);
  const rewardTokens = [
    await pairInfo.read.token0(),
    await pairInfo.read.token1(),
  ];
  const feeVaultAddr = poolAddr; // For Solidly pools, the pair itself is the FeeVault
  await gaugeFactory.write.createGauge([
    [beamToken.address],
    poolAddr,
    feeVaultAddr,
    ZERO_ADDRESS, // votingIncentives, set after
    false, // isWeighted, false for Solidly pools
  ]);
  const events = await gaugeFactory.getEvents.CreateGauge();
  const gaugeAddr = events[0].args.gauge as Address;

  await votingIncentivesFactory.write.createVotingIncentives([
    rewardTokens[0],
    rewardTokens[1],
    gaugeAddr,
  ]);
  const votingIncentivesAddr = await votingIncentivesFactory.read.last_votingIncentives();
  await gaugeFactory.write.setVotingIncentives([gaugeAddr, votingIncentivesAddr]);

  await voter.write.addPoolData([poolAddr, gaugeAddr, votingIncentivesAddr]);

  return {
    poolAddr,
    gaugeAddr,
    votingIncentivesAddr,
  };
};

/// Farming Solidly Pairs

export type AddLiquidityAndStakeForFarmingArgs = {
  deployerAddress: Address,
  farmerAddress: Address,
  solidlyRouter: SolidlyRouterContract,
  publicClient: PublicClient,
  solidlyPools: {
    poolAddr: Address,
    gaugeAddr: Address,
  }[]
};

export const addLiquidityAndStakeForFarming = async ({
  deployerAddress,
  farmerAddress,
  solidlyRouter,
  publicClient,
  solidlyPools,
}: AddLiquidityAndStakeForFarmingArgs) => {
  for (const {poolAddr, gaugeAddr} of solidlyPools) {
    const pairInfo = await hre.viem.getContractAt("IPairInfo", poolAddr);
    const [token0Addr, token1Addr] = [await pairInfo.read.token0(), await pairInfo.read.token1()];
    const [token0, token1] = [await hre.viem.getContractAt("ERC20", token0Addr), await hre.viem.getContractAt("ERC20", token1Addr)];
    const balances = [await token0.read.balanceOf([deployerAddress]), await token1.read.balanceOf([deployerAddress])]

    const amount0 = balances[0] * 10n / 100n; // 10% of balance
    const amount1 = balances[1] * 10n / 100n; // 10% of balance

    await token0.write.approve([solidlyRouter.address, amount0]);
    await token1.write.approve([solidlyRouter.address, amount1]);

    const timestamp = (await publicClient.getBlock()).timestamp;
    await solidlyRouter.write.addLiquidity([
      token0Addr,
      token1Addr,
      false,
      amount0,
      amount1,
      0n,
      0n,
      farmerAddress,
      timestamp + 1000n,
    ]);

    const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);
    const pool = await hre.viem.getContractAt("ERC20", poolAddr);
    await pool.write.approve([gaugeAddr, await pool.read.balanceOf([farmerAddress])], { account: farmerAddress });
    await gauge.write.depositAll({ account: farmerAddress });
  }
}

/// Deposit of Voting incentives

export type AddVotingIncentivesArgs = {
  pools: {
    poolAddr: Address,
    gaugeAddr: Address,
    votingIncentivesAddr: Address,
  }[],
  beamToken: EmissionTokenContract,
  deployerAddress: Address,
};

export type VotingIncentivesReward = {
  incentivesAmount: bigint;
  feesAmount: bigint;
}

export const addVotingIncentives = async ({
  pools,
  beamToken,
  deployerAddress,
}: AddVotingIncentivesArgs) => {
  const addedIncentives: Record<Address, Record<Address, VotingIncentivesReward>> = {};
  for (const {poolAddr, gaugeAddr, votingIncentivesAddr} of pools) {
    const pairInfo = await hre.viem.getContractAt("IPairInfo", poolAddr);
    const pairTokens = [await pairInfo.read.token0(), await pairInfo.read.token1()];
    addedIncentives[poolAddr] = {
      [beamToken.address]: {
        incentivesAmount: 0n,
        feesAmount: 0n,
      },
      [pairTokens[0]]: {
        incentivesAmount: 0n,
        feesAmount: 0n,
      },
      [pairTokens[1]]: {
        incentivesAmount: 0n,
        feesAmount: 0n,
      },
    }
    const votingIncentives = await hre.viem.getContractAt("VotingIncentives", votingIncentivesAddr);
    const balance = await beamToken.read.balanceOf([deployerAddress]);
    const beamRewardAmount = balance * 10n / 100n; // 10% of balance
    expect(beamRewardAmount > 0n).to.be.true;
    await beamToken.write.approve([votingIncentives.address, beamRewardAmount]);
    await votingIncentives.write.notifyRewardAmount([beamToken.address, beamRewardAmount]);
    addedIncentives[poolAddr][beamToken.address].incentivesAmount += beamRewardAmount;

    await impersonateAccount(gaugeAddr); // Impersonate gauge to simulate distribution of swap fees
    await setBalance(gaugeAddr, parseEther("1")); // Provide some gas
    for (const tokenAddr of pairTokens) {
      const token = await hre.viem.getContractAt("ERC20", tokenAddr);
      const balance = await token.read.balanceOf([deployerAddress]);
      const rewardAmount = balance * 10n / 100n; // 10% of balance
      expect(rewardAmount > 0n).to.be.true;
      await token.write.transfer([gaugeAddr, rewardAmount]);
      await token.write.approve([votingIncentives.address, rewardAmount], {account: gaugeAddr});
      await votingIncentives.write.notifyRewardAmount([tokenAddr, rewardAmount], {account: gaugeAddr});
      addedIncentives[poolAddr][tokenAddr].feesAmount += rewardAmount;
    }
  }
  return addedIncentives;
}

export const TestTokens = buildModule("TestTokens", (m) => {
  const USDC = m.contract("ERC20PresetMinterPauser", ["USDC", "USDC"], { id: "USDC"});
  m.call(USDC, "mint", [m.getAccount(0), 10_000_000_000n]);
  const WETH = m.contract("ERC20PresetMinterPauser", ["Wrapped Ether", "WETH"], { id: "WETH"});
  m.call(WETH, "mint", [m.getAccount(0), 42_000_000n]);

  return {
    USDC,
    WETH,
  }
});

export const getPairs = <T>(values: T[]) => {
  const result = [] as [T,T][];
  for (let firstIdx = 0; firstIdx < values.length; ++firstIdx) {
    const first = values[firstIdx];
    for (let secondIdx = firstIdx + 1; secondIdx < values.length; ++secondIdx) {
      const second = values[secondIdx];
      result.push([first, second]);
    }
  }
  return result;
}

export const getRandomVoteWeight = (rng: Mulberry32) => {
  const MAX_SINGLE_WEIGHT = 10000; // Constant defined in Voter.sol
  return BigInt(rng.nextInt(0, MAX_SINGLE_WEIGHT));
}
