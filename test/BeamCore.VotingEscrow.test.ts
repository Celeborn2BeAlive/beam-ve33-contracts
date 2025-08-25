import hre, { ignition } from "hardhat";
import BeamCore from "../ignition/modules/Beam.Core";
import { getAddress } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork } from "./constants";
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
    const [deployer, team, user, voter] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const teamAddress = getAddress(team.account.address);
    const userAddress = getAddress(user.account.address);
    const voterAddress = getAddress(voter.account.address);

    const beamCore = await ignition.deploy(BeamCore);

    const { beamToken, votingEscrow } = beamCore;

    // Change voter in order to test security
    await votingEscrow.write.setVoter([voterAddress]);
    // Change team in order to test security
    await votingEscrow.write.setTeam([teamAddress]);

    return {
      ...beamCore,
      deployer,
      deployerAddress,
      team,
      teamAddress,
      user,
      userAddress,
      voter,
      voterAddress,
    };
  };

  describe("Team admin", () => {
    it("Should allow `team` to call `setTeam()`", async () => {
      const { votingEscrow, teamAddress, userAddress } = await loadFixture(deployFixture);
      await votingEscrow.write.setTeam([userAddress], {account: teamAddress});
      expect(await votingEscrow.read.team()).to.equals(userAddress);
    })
    it("Should allow `team` to call `setArtProxy()`", async () => {
      const { votingEscrow, teamAddress, userAddress } = await loadFixture(deployFixture);
      await votingEscrow.write.setArtProxy([userAddress], {account: teamAddress});
      expect(await votingEscrow.read.artProxy()).to.equals(userAddress);
    })
    it("Should allow `team` to call `setVoter()`", async () => {
      const { votingEscrow, teamAddress, userAddress } = await loadFixture(deployFixture);
      await votingEscrow.write.setVoter([userAddress], {account: teamAddress});
      expect(await votingEscrow.read.voter()).to.equals(userAddress);
    })
    it("Should prevent others to call `setTeam()`", async () => {
      const { votingEscrow, deployerAddress, userAddress } = await loadFixture(deployFixture);
      await expect(votingEscrow.write.setTeam([deployerAddress], {account: deployerAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.setTeam([userAddress], {account: userAddress})).to.be.rejectedWith("");
    })
    it("Should prevent others to call `setArtProxy()`", async () => {
      const { votingEscrow, deployerAddress, userAddress } = await loadFixture(deployFixture);
      await expect(votingEscrow.write.setArtProxy([deployerAddress], {account: deployerAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.setArtProxy([userAddress], {account: userAddress})).to.be.rejectedWith("");
    })
    it("Should prevent others to call `setVoter()`", async () => {
      const { votingEscrow, deployerAddress, userAddress } = await loadFixture(deployFixture);
      await expect(votingEscrow.write.setVoter([deployerAddress], {account: deployerAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.setVoter([userAddress], {account: userAddress})).to.be.rejectedWith("");
    })
  });

  describe("Voter interactions", () => {
    it("Should allow voter to call `voting()`", async () => {
      const { votingEscrow, voterAddress } = await loadFixture(deployFixture);

      expect(await votingEscrow.read.voted([42n])).to.be.false;

      await votingEscrow.write.voting([42n], {account: voterAddress});
      expect(await votingEscrow.read.voted([42n])).to.be.true;
    })
    it("Should allow voter to call `abstain()`", async () => {
      const { votingEscrow, voterAddress } = await loadFixture(deployFixture);
      await votingEscrow.write.voting([42n], {account: voterAddress});
      await votingEscrow.write.abstain([42n], {account: voterAddress});
      expect(await votingEscrow.read.voted([42n])).to.be.false;
    })
    it("Should prevent others to call `voting()`", async () => {
      const { votingEscrow, deployerAddress, teamAddress, userAddress } = await loadFixture(deployFixture);
      await expect(votingEscrow.write.voting([42n], {account: deployerAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.voting([12n], {account: userAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.voting([128n], {account: teamAddress})).to.be.rejectedWith("");
    })
    it("Should prevent others to call `abstain()`", async () => {
      const { votingEscrow, deployerAddress, teamAddress, userAddress } = await loadFixture(deployFixture);
      await expect(votingEscrow.write.abstain([42n], {account: deployerAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.abstain([12n], {account: userAddress})).to.be.rejectedWith("");
      await expect(votingEscrow.write.abstain([128n], {account: teamAddress})).to.be.rejectedWith("");
    })
  });
});
