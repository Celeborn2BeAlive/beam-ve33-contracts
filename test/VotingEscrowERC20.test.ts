import hre from "hardhat";
import { expect } from "chai";
import { loadFixture, mine, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress, parseEther, parseUnits } from "viem";
import { beamTokenName, beamTokenSymbol } from "../ignition/modules/constants";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { BeamToken, VotingEscrow, VotingEscrowERC20 } from "../ignition/modules/Beam.Core";
import { INITIAL_BEAM_TOKEN_SUPPLY, WEEK } from "./constants";
import { create10PercentOfTotalSupplyLock } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";

const DeploymentSetup = buildModule("VotingEscrowERC20_Setup", (m) => {
  const { beamToken } = m.useModule(BeamToken);
  const { votingEscrow } = m.useModule(VotingEscrow);
  const { bveBeamToken } = m.useModule(VotingEscrowERC20);

  return {
    beamToken,
    bveBeamToken,
    votingEscrow,
  }
});

describe("VotingEscrowERC20", () => {
  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const publicClient = await hre.viem.getPublicClient();

    const deployment = await hre.ignition.deploy(DeploymentSetup);

    return {
      ...deployment,
      deployer,
      user,
      publicClient,
    };
  };

  describe("Deployment", () => {
    it("Should set the right name", async () => {
      const { bveBeamToken } = await loadFixture(deployFixture);
      expect(await bveBeamToken.read.name()).to.equal(`bve${beamTokenName}`);
    });

    it("Should set the right symbol", async () => {
      const { bveBeamToken } = await loadFixture(deployFixture);
      expect(await bveBeamToken.read.symbol()).to.equal(`bve${beamTokenSymbol}`);
    });

    it("Should have 18 decimals", async () => {
      const { bveBeamToken } = await loadFixture(deployFixture);
      expect(await bveBeamToken.read.decimals()).to.equal(18);
    });

    it("Should have 0 total supply", async () => {
      const { bveBeamToken } = await loadFixture(deployFixture);
      expect(await bveBeamToken.read.totalSupply()).to.equal(0n);
    });
  });

  describe("Deployment", () => {
    it("Should have votingEscrow as state variable", async () => {
      const { bveBeamToken, votingEscrow } = await loadFixture(deployFixture);
      expect(await bveBeamToken.read.votingEscrow()).to.equals(votingEscrow.address);
    });
  });

  describe("Mint", () => {
    it("Should lock BEAM and mint bveBEAM", async () => {
      const { beamToken, bveBeamToken, deployer, user } = await loadFixture(deployFixture);

      const initialSupply = parseEther("64000");
      await beamToken.write.mint([deployer.account.address, initialSupply]);

      const amount = parseEther("32000");
      await beamToken.write.approve([bveBeamToken.address, amount]);
      await bveBeamToken.write.mint([amount, user.account.address]);

      expect(await bveBeamToken.read.totalSupply()).to.equals(amount);
      expect(await bveBeamToken.read.balanceOf([user.account.address])).to.equals(amount);
      expect(await beamToken.read.balanceOf([deployer.account.address])).to.equals(
        initialSupply - amount
      );

      const mintEvents = await bveBeamToken.getEvents.Mint();
      expect(mintEvents.length).to.equals(1);
      const [mintEvent, ..._] = mintEvents;
      expect(mintEvent.args.account).to.equals(getAddress(deployer.account.address));
      expect(mintEvent.args.amount).to.equals(amount);
      expect(mintEvent.args.recipient).to.equals(getAddress(user.account.address));
    });

    it("Should fail when user don't have enough BEAM", async () => {
      const { beamToken, bveBeamToken, user } = await loadFixture(deployFixture);

      const amount = parseEther("32000");
      await beamToken.write.approve([bveBeamToken.address, amount]);

      await expect(bveBeamToken.write.mint([amount, user.account.address])).to.be.rejectedWith("");
    });
  });

  describe("Exercise", () => {
    it("Should burn bveBEAM and mint veBEAM NFT", async () => {
      const { beamToken, bveBeamToken, votingEscrow, deployer, user, publicClient } = await loadFixture(deployFixture);

      const initialSupply = parseEther("64000");
      await beamToken.write.mint([deployer.account.address, initialSupply]);

      const amount = parseEther("32000");
      await beamToken.write.approve([bveBeamToken.address, amount]);
      await bveBeamToken.write.mint([amount, deployer.account.address]);

      const amountToExerciseToUser = parseEther("16000");
      await bveBeamToken.write.exerciseVe([amountToExerciseToUser, user.account.address]);
      const amountToExerciseToDeployer = parseEther("8000");
      await bveBeamToken.write.exerciseVe([amountToExerciseToDeployer, deployer.account.address]);

      const MAXTIME = await votingEscrow.read.MAXTIME();
      const timestamp = (await publicClient.getBlock()).timestamp;
      const expectedUnlockTime = (timestamp + MAXTIME) / WEEK * WEEK; // Round to week

      const expectedNewSupply = amount - amountToExerciseToUser - amountToExerciseToDeployer;
      expect(await bveBeamToken.read.totalSupply()).to.equals(expectedNewSupply);
      expect(await bveBeamToken.read.balanceOf([deployer.account.address])).to.equals(expectedNewSupply);
      expect(await beamToken.read.balanceOf([bveBeamToken.address])).to.equals(expectedNewSupply);
      expect(await beamToken.read.balanceOf([votingEscrow.address])).to.equals(amountToExerciseToUser + amountToExerciseToDeployer);

      expect(await votingEscrow.read.balanceOf([user.account.address])).to.equals(1n);
      const lockIdOfUser = await votingEscrow.read.tokenOfOwnerByIndex([user.account.address, 0n]);
      const [lockAmountOfUser, lockEndOfUser] = await votingEscrow.read.locked([lockIdOfUser]);
      expect(lockAmountOfUser).to.equals(amountToExerciseToUser);
      expect(lockEndOfUser).to.equals(expectedUnlockTime);
      expect(await votingEscrow.read.balanceOfNFT([lockIdOfUser]) > 0n).to.be.true;

      expect(await votingEscrow.read.balanceOf([deployer.account.address])).to.equals(1n);
      const lockIdOfDeployer = await votingEscrow.read.tokenOfOwnerByIndex([deployer.account.address, 0n]);
      const [lockAmountOfDeployer, lockEndOfDeployer] = await votingEscrow.read.locked([lockIdOfDeployer]);
      expect(lockAmountOfDeployer).to.equals(amountToExerciseToDeployer);
      expect(lockEndOfDeployer).to.equals(expectedUnlockTime);
      expect(await votingEscrow.read.balanceOfNFT([lockIdOfDeployer]) > 0n).to.be.true;

      // TODO tests events
    });

    it("Should fail when user don't have enough bveBEAM", async () => {
      const { beamToken, bveBeamToken } = await loadFixture(deployFixture);

      // TODO
    });
  });
});
