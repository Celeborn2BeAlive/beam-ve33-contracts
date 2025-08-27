import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { WEEK } from "./constants";
import { ClaimerContract, EmissionTokenContract, EpochDistributorContract, GaugeFactoryContract, MinterContract, VoterContract, VotingEscrowContract, VotingIncentivesFactoryContract } from "./types";
import { Address } from "viem";
import { ZERO_ADDRESS } from "../ignition/modules/constants";

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

export type CreateGaugeForPoolWithoutGlobalFactoryArgs = {
  poolAddr: Address,
  gaugeFactory: GaugeFactoryContract,
  epochDistributor: EpochDistributorContract,
  claimer: ClaimerContract,
  votingIncentivesFactory: VotingIncentivesFactoryContract,
  voter: VoterContract,
  beamToken: EmissionTokenContract,
}

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
) => {
  const pairInfo = await hre.viem.getContractAt("IPairInfo", poolAddr);
  const rewardTokens = [
    await pairInfo.read.token0(),
    await pairInfo.read.token1(),
  ];
  await gaugeFactory.write.createGauge([
    [beamToken.address],
    poolAddr,
    epochDistributor.address,
    poolAddr, // feeVault: for Solidly pools, the pair itself is the FeeVault
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
  };
};
