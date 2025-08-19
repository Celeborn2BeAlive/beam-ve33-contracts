import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { MAX_LOCKTIME, WEEK } from "./constants";
import { EmissionTokenContract, MinterContract, VotingEscrowContract } from "./types";

export const simulateOneWeek = async (activePeriod: bigint) => {
  const nextPeriod = activePeriod + WEEK;
  await time.setNextBlockTimestamp(activePeriod + WEEK);
  return { nextPeriod };
};

export const simulateOneWeekAndFlipEpoch = async (minter: MinterContract) => {
  const activePeriod = await minter.read.active_period();
  const returnValue = await simulateOneWeek(activePeriod);
  await minter.write.update_period();
  return returnValue;
}

export const create10PercentOfTotalSupplyLock = async (
  beamToken: EmissionTokenContract,
  votingEscrow: VotingEscrowContract,
) => {
  // Lock 10% of total supply
  const totalSupply = await beamToken.read.totalSupply();
  const depositAmount = totalSupply / 10n;
  await beamToken.write.approve([votingEscrow.address, depositAmount]);
  await votingEscrow.write.create_lock([depositAmount, MAX_LOCKTIME]);
  const events = await votingEscrow.getEvents.Transfer();
  return events[0].args.tokenId as bigint;
};
