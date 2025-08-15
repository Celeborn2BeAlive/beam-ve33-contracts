import hre, { ignition } from "hardhat";
import BeamCore from "../ignition/modules/Beam.Core";
import { getAddress } from "viem";
import { isHardhatNetwork } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { beamTokenName, beamTokenSymbol, veBeamTokenName, veBeamTokenSymbol } from "../ignition/modules/constants";

describe("BeamCore", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);

    const beamCore = await ignition.deploy(BeamCore);

    return {
      deployer,
      deployerAddress,
      ...beamCore,
    };
  };

  describe("Deployment", () => {
    describe("BeamToken", () => {
      it("Should set the right token name", async () => {
        const { beamToken } = await loadFixture(deployFixture);
        expect(await beamToken.read.name()).to.equal(beamTokenName);
      });

      it("Should set the right token symbol", async () => {
        const { beamToken } = await loadFixture(deployFixture);
        expect(await beamToken.read.symbol()).to.equal(beamTokenSymbol);
      });

      it("Should set `minter` as the deployer address", async () => {
        const { beamToken, deployerAddress } = await loadFixture(deployFixture);
        expect(await beamToken.read.minter()).to.equal(deployerAddress);
      });
    });

    describe("VotingEscrow", () => {
      it("Should set the right token name", async () => {
        const { votingEscrow } = await loadFixture(deployFixture);
        expect(await votingEscrow.read.name()).to.equal(veBeamTokenName);
      });

      it("Should set the right token symbol", async () => {
        const { votingEscrow } = await loadFixture(deployFixture);
        expect(await votingEscrow.read.symbol()).to.equal(veBeamTokenSymbol);
      });

      it("Should set `team` as the deployer address", async () => {
        const { votingEscrow, deployerAddress } = await loadFixture(deployFixture);
        expect(await votingEscrow.read.team()).to.equal(deployerAddress);
      });

      it("Should set `voter` as the Voter contract address", async () => {
        const { votingEscrow, voter } = await loadFixture(deployFixture);
        expect(await votingEscrow.read.voter()).to.equal(voter.address);
      });

      it("Should set `token` as the Beam token contract address", async () => {
        const { votingEscrow, beamToken } = await loadFixture(deployFixture);
        expect(await votingEscrow.read.token()).to.equal(beamToken.address);
      });

      it("Should set `artProxy` as the VeArtProxy proxy contract address", async () => {
        const { votingEscrow, veArtProxyProxy } = await loadFixture(deployFixture);
        expect(await votingEscrow.read.artProxy()).to.equal(veArtProxyProxy.address);
      });
    });

    describe("Minter", () => {
      it("Should set `owner` as the deployer address", async () => {
        const { minterProxy, deployerAddress } = await loadFixture(deployFixture);
        expect(await minterProxy.read.owner()).to.equal(deployerAddress);
      });

      it("Should set `team` as the deployer address", async () => {
        const { minterProxy, deployerAddress } = await loadFixture(deployFixture);
        expect(await minterProxy.read.team()).to.equal(deployerAddress);
      });

      it("Should set `_emissionToken` as the Beam token contract address", async () => {
        const { minterProxy, beamToken } = await loadFixture(deployFixture);
        expect(await minterProxy.read._emissionToken()).to.equal(beamToken.address);
      });

      it("Should set `_epochDistributor` as the EpochDistributor proxy contract address", async () => {
        const { minterProxy, epochDistributorProxy } = await loadFixture(deployFixture);
        expect(await minterProxy.read._epochDistributor()).to.equal(epochDistributorProxy.address);
      });

      it("Should set `_rebase_distributor` as the RebaseDistributor contract address", async () => {
        const { minterProxy, rebaseDistributor } = await loadFixture(deployFixture);
        expect(await minterProxy.read._rebase_distributor()).to.equal(rebaseDistributor.address);
      });

      it("Should set `_ve` as the VotingEscrow contract address", async () => {
        const { minterProxy, votingEscrow } = await loadFixture(deployFixture);
        expect(await minterProxy.read._ve()).to.equal(votingEscrow.address);
      });
    });

    describe("RebaseDistributor", () => {
      it("Should set `owner` as the deployer address", async () => {
        const { rebaseDistributor, deployerAddress } = await loadFixture(deployFixture);
        expect(await rebaseDistributor.read.owner()).to.equal(deployerAddress);
      });

      it("Should set `voting_escrow` as the VotingEscrow contract address", async () => {
        const { rebaseDistributor, votingEscrow } = await loadFixture(deployFixture);
        expect(await rebaseDistributor.read.voting_escrow()).to.equal(votingEscrow.address);
      });

      it("Should set `token` as the Beam token contract address", async () => {
        const { rebaseDistributor, beamToken } = await loadFixture(deployFixture);
        expect(await rebaseDistributor.read.token()).to.equal(beamToken.address);
      });

      it("Should set `depositor` as the Minter proxy contract address", async () => {
        const { rebaseDistributor, minterProxy } = await loadFixture(deployFixture);
        expect(await rebaseDistributor.read.depositor()).to.equal(minterProxy.address);
      });
    });

    describe("Voter", () => {
      it("Should set `owner` as the deployer address", async () => {
        const { voter, deployerAddress } = await loadFixture(deployFixture);
        expect(await voter.read.owner()).to.equal(deployerAddress);
      });

      it("Should set `minter` as the Minter proxy address", async () => {
        const { voter, minterProxy } = await loadFixture(deployFixture);
        expect(await voter.read.minter()).to.equal(minterProxy.address);
      });

      it("Should set `ve` as the VotingEscrow address", async () => {
        const { voter, votingEscrow } = await loadFixture(deployFixture);
        expect(await voter.read.ve()).to.equal(votingEscrow.address);
      });

      it("Should have empty pools array", async () => {
        const { voter } = await loadFixture(deployFixture);
        expect(await voter.read.poolsLength()).to.equal(0n);
      });

      it("Should set deployer address as manager", async () => {
        const { voter, deployerAddress } = await loadFixture(deployFixture);
        expect(await voter.read.isManager([deployerAddress])).to.equal(true);
      });
    });

    describe("EpochDistributor", () => {
      it("Should set `owner` as the deployer address", async () => {
        const { epochDistributorProxy, deployerAddress } = await loadFixture(deployFixture);
        expect(await epochDistributorProxy.read.owner()).to.equal(deployerAddress);
      });

      it("Should set `minter` as the Minter proxy address", async () => {
        const { epochDistributorProxy, minterProxy } = await loadFixture(deployFixture);
        expect(await epochDistributorProxy.read.minter()).to.equal(minterProxy.address);
      });

      it("Should set `emissionToken` as the Minter proxy address", async () => {
        const { epochDistributorProxy, beamToken } = await loadFixture(deployFixture);
        expect(await epochDistributorProxy.read.emissionToken()).to.equal(beamToken.address);
      });

      it("Should set `voter` as the Voter address", async () => {
        const { epochDistributorProxy, voter } = await loadFixture(deployFixture);
        expect(await epochDistributorProxy.read.voter()).to.equal(voter.address);
      });

      it("Should set `lastPool` to 0", async () => {
        const { epochDistributorProxy } = await loadFixture(deployFixture);
        expect(await epochDistributorProxy.read.lastPool()).to.equal(0n);
      });
    });

    describe("Claimer", () => {
      it("Should set `owner` as the deployer address", async () => {
        const { claimer, deployerAddress } = await loadFixture(deployFixture);
        expect(await claimer.read.owner()).to.equal(deployerAddress);
      });

      it("Should set `ve` as the VotingEscrow contract address", async () => {
        const { claimer, votingEscrow } = await loadFixture(deployFixture);
        expect(await claimer.read.ve()).to.equal(votingEscrow.address);
      });
    });
  });
});
