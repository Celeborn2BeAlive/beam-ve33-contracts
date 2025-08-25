import { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { ERC20$Type } from "../artifacts/@openzeppelin/contracts/token/ERC20/ERC20.sol/ERC20";
import type { ERC20PresetMinterPauser$Type } from "../artifacts/@openzeppelin/contracts/token/ERC20/presets/ERC20PresetMinterPauser.sol/ERC20PresetMinterPauser";
import type { EmissionToken$Type } from "../artifacts/contracts/EmissionToken.sol/EmissionToken";
import type { VotingEscrow$Type } from "../artifacts/contracts/VotingEscrow.sol/VotingEscrow";
import type { MinterUpgradeable$Type } from "../artifacts/contracts/MinterUpgradeable.sol/MinterUpgradeable";
import type { Voter$Type } from "../artifacts/contracts/Voter.sol/Voter";
import type { EpochDistributorUpgradeable$Type } from "../artifacts/contracts/EpochDistributorUpgradeable.sol/EpochDistributorUpgradeable";
import type { Claimer$Type } from "../artifacts/contracts/Claimer.sol/Claimer";
import type { VotingIncentivesFactory$Type } from "../artifacts/contracts/VotingIncentivesFactory.sol/VotingIncentivesFactory";
import type { GaugeFactory$Type } from "../artifacts/contracts/GaugeFactory.sol/GaugeFactory";
import type { RouterV2$Type } from "../artifacts/contracts/solidly/RouterV2.sol/RouterV2";

export type EmissionTokenContract = GetContractReturnType<EmissionToken$Type["abi"]>;
export type VotingEscrowContract = GetContractReturnType<VotingEscrow$Type["abi"]>;
export type MinterContract = GetContractReturnType<MinterUpgradeable$Type["abi"]>;
export type VoterContract = GetContractReturnType<Voter$Type["abi"]>;
export type EpochDistributorContract = GetContractReturnType<EpochDistributorUpgradeable$Type["abi"]>;
export type ClaimerContract = GetContractReturnType<Claimer$Type["abi"]>;

export type VotingIncentivesFactoryContract = GetContractReturnType<VotingIncentivesFactory$Type["abi"]>;
export type GaugeFactoryContract = GetContractReturnType<GaugeFactory$Type["abi"]>;

export type SolidlyRouterContract = GetContractReturnType<RouterV2$Type["abi"]>;

export type ERC20PresetMinterPauserContract = GetContractReturnType<ERC20PresetMinterPauser$Type["abi"]>;
export type ERC20Contract = GetContractReturnType<ERC20$Type["abi"]>;
