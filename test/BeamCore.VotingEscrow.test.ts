import hre, { ignition } from "hardhat";
import BeamCore from "../ignition/modules/Beam.Core";
import { getAddress, parseEther } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork, WEEK } from "./constants";
import { loadFixture, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import fs from "node:fs";

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
    const publicClient = await hre.viem.getPublicClient()

    const beamCore = await ignition.deploy(BeamCore);

    const { beamToken, votingEscrow } = beamCore;

    await beamToken.write.mint([userAddress, INITIAL_BEAM_TOKEN_SUPPLY]);

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
      publicClient,
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

  describe("Lock", () => {
    it("Should lock tokens and create veNFT", async () => {
      const { beamToken, votingEscrow, userAddress, publicClient } = await loadFixture(deployFixture);

      const balanceBeforeLock = await beamToken.read.balanceOf([userAddress]);
      const amount = parseEther("1000000"); // 1M
      const duration = await votingEscrow.read.MAXTIME() / 2n;

      await beamToken.write.approve([votingEscrow.address, amount], {account: userAddress});
      const timestamp = (await publicClient.getBlock()).timestamp;
      const timestampTarget = (timestamp / WEEK * WEEK) + WEEK;
      await time.setNextBlockTimestamp(timestampTarget); // Align next block to a weekly timestamp to get predictable results

      const expectedUnlockTime = (timestampTarget + duration) / WEEK * WEEK; // Round to week
      await votingEscrow.write.create_lock([amount, duration], {account: userAddress});
      const balanceAfterLock = await beamToken.read.balanceOf([userAddress]);

      expect(await votingEscrow.read.tokenOfOwnerByIndex([userAddress, 0n])).to.equals(1n);
      expect(await votingEscrow.read.ownerOf([1n])).to.equals(userAddress);
      expect(balanceAfterLock).to.equals(balanceBeforeLock - amount);
      const [lockedAmount, lockedEnd] = await votingEscrow.read.locked([1n]);
      expect(lockedAmount).to.equals(amount);
      expect(lockedEnd).to.equals(expectedUnlockTime);

      const tokenURI = await votingEscrow.read.tokenURI([1n]);
      const tokenJson = JSON.parse(Buffer.from(tokenURI.split("data:application/json;base64,")[1], 'base64').toString());
      expect(tokenJson["name"]).to.equals("lock #1");
      expect(tokenJson["description"]).to.equals("veNFT locks, can be used to vote on token emissions and receive voting rewards");
      expect(tokenJson["image"].split(",")[0]).to.equals("data:image/svg+xml;base64");
      const svgData = Buffer.from(tokenJson["image"].split("data:image/svg+xml;base64,")[1], 'base64').toString();
      const refFile = `${__dirname}/__snapshots__/veNFT.svg`;

      if (!fs.existsSync(refFile)) {
        fs.writeFileSync(refFile, svgData);
      } else {
        const refData = fs.readFileSync(refFile, {encoding: "utf-8"});
        expect(svgData).to.equals(refData);
      }
    })
  });
});
