import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { WEEK } from "./constants";
import { ClaimerContract, EmissionTokenContract, EpochDistributorContract, GaugeFactoryContract, GlobalFactoryContract, MinterContract, VoterContract, VotingEscrowContract, VotingIncentivesFactoryContract } from "./types";
import { Address, getAddress } from "viem";
import { ZERO_ADDRESS } from "../ignition/modules/constants";
import { expect } from "chai";

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
