import hre, { ignition } from "hardhat";
import BeamCore from "../ignition/modules/Beam.Core";
import { getAddress } from "viem";
import { isHardhatNetwork } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { beamTokenName, beamTokenSymbol, veBeamTokenName, veBeamTokenSymbol } from "../ignition/modules/constants";

describe("BeamCore.VotingEscrow", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, team, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const teamAddress = getAddress(team.account.address);
    const userAddress = getAddress(team.account.address);

    const beamCore = await ignition.deploy(BeamCore);

    const { votingEscrow } = beamCore;

    // Change team in order to test security
    await votingEscrow.write.setTeam([teamAddress]);

    return {
      deployer,
      deployerAddress,
      team,
      teamAddress,
      user,
      userAddress,
      ...beamCore,
    };
  };

  describe("Team admin", () => {
    it("Should allow `team` to call `setTeam()`", async () => {})
    it("Should allow `team` to call `setArtProxy()`", async () => {})
    it("Should allow `team` to call `setVoter()`", async () => {})
    it("Should prevent others to call `setTeam()`", async () => {})
    it("Should prevent others to call `setArtProxy()`", async () => {})
    it("Should prevent others to call `setVoter()`", async () => {})
  });

  describe("Voter interactions", () => {
    it("Should allow voter to call `voting()`", async () => {})
    it("Should allow voter to call `abstain()`", async () => {})
    it("Should allow voter to call `attach()`", async () => {})
    it("Should allow voter to call `detach()`", async () => {})
    it("Should prevent others `voting()`", async () => {})
    it("Should prevent others `abstain()`", async () => {})
    it("Should prevent others `attach()`", async () => {})
    it("Should prevent others `detach()`", async () => {})
  });

  describe("Lock", () => {
    it("Should lock tokens in exchange of veNFT`", async () => {})
    it("Should increase lock amount of veNFT`", async () => {})
    it("Should increase unlock time`", async () => {})
    it("Should decrease voting power linearly`", async () => {})
    it("Should withdraw tokens after lock expiration`", async () => {})
  })
});
