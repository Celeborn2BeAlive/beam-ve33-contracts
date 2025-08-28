import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { WEEK } from "./constants";
import { ClaimerContract, EmissionTokenContract, EpochDistributorContract, ERC20PresetMinterPauserContract, GaugeFactoryContract, GlobalFactoryContract, MinterContract, SolidlyRouterContract, VoterContract, VotingEscrowContract, VotingIncentivesFactoryContract } from "./types";
import { Address, getAddress, parseUnits, PublicClient } from "viem";
import { ZERO_ADDRESS } from "../ignition/modules/constants";
import { expect } from "chai";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

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

export type CreateGaugeResult = {
  poolAddr: Address,
  gaugeAddr: Address,
  votingIncentivesAddr: Address,
  feeVaultAddr: Address,
};

export type CreateGaugeForPoolWithGlobalFactoryArgs = {
  poolAddr: Address,
  globalFactory: GlobalFactoryContract,
};

// Implement standard workflow of creating a Gauge for a Solidly pool using the GlobalFactory.
// This is how it should be done in production.
// The creation of gauges for Solidly pools is permissionless, but:
// - POOL_TYPE_SOLIDLY should be enabled on the GlobalFactory using globalFactory.setPoolType before calling the function
// - tokens of the pool should be whitelisted on the GlobalFactory using globalFactory.addToken
// Note: Beam protocol will probably not enable Solidly pools, unless required to integrate full-range pools.
export const createGaugeForSolidlyPoolWithGlobalFactory = async (
  {
    poolAddr,
    globalFactory,
  }: CreateGaugeForPoolWithGlobalFactoryArgs
): Promise<CreateGaugeResult> => {
  await globalFactory.write.create([poolAddr, await globalFactory.read.POOL_TYPE_SOLIDLY()]);
  const createEvents = await globalFactory.getEvents.Create();
  expect(createEvents).to.have.length(1);
  const {} = createEvents[0].args;
  return {
    poolAddr,
    gaugeAddr: getAddress(createEvents[0].args.gauge as Address),
    votingIncentivesAddr: getAddress(createEvents[0].args.votingIncentives as Address),
    feeVaultAddr: getAddress(createEvents[0].args.feeVault as Address),
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
    epochDistributor.address,
    feeVaultAddr,
    ZERO_ADDRESS, // votingIncentives, set after
    claimer.address,
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
    feeVaultAddr,
  };
};

/// Farming Solidly Pairs

export type AddLiquidityAndStakeForFarmingArgs = {
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

export const addLiquidityAndStakeForFarming = async ({
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

/// Deposit of Voting incentives

export type AddVotingIncentivesArgs = {
  pools: Record<string, {
    poolAddr: Address,
    votingIncentivesAddr: Address,
  }>,
  beamToken: EmissionTokenContract,
  deployerAddress: Address,
};

export const addVotingIncentives = async ({
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
