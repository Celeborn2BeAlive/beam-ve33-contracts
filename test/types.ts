import { GetContractReturnType } from "@nomicfoundation/hardhat-viem/types";
import type { EmissionToken$Type } from "../artifacts/contracts/EmissionToken.sol/EmissionToken"
import type { VotingEscrow$Type } from "../artifacts/contracts/VotingEscrow.sol/VotingEscrow"
import type { MinterUpgradeable$Type } from "../artifacts/contracts/MinterUpgradeable.sol/MinterUpgradeable"

export type EmissionTokenContract = GetContractReturnType<EmissionToken$Type["abi"]>;
export type VotingEscrowContract = GetContractReturnType<VotingEscrow$Type["abi"]>;
export type MinterContract = GetContractReturnType<MinterUpgradeable$Type["abi"]>;
