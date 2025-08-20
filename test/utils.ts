import hre from "hardhat";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { WEEK } from "./constants";
import { EmissionTokenContract, MinterContract, VotingEscrowContract } from "./types";

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
