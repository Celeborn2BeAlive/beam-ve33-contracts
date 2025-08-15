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
  });
});
