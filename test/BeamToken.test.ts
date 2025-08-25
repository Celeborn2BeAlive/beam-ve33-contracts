import hre from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress } from "viem";
import { beamTokenName, beamTokenSymbol } from "../ignition/modules/constants";
import { INITIAL_BEAM_TOKEN_SUPPLY } from "./constants";

describe("BeamToken", () => {
  const deployFixture = async () => {
    const [deployer, otherAccount] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const otherAccountAddress = getAddress(otherAccount.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beamToken = await hre.viem.deployContract(
      "EmissionToken",
      [beamTokenName, beamTokenSymbol],
    );

    return {
      beamToken,
      deployer,
      deployerAddress,
      otherAccount,
      otherAccountAddress,
      publicClient,
    };
  };

  describe("Deployment", () => {
    it("Should set the right name", async () => {
      const { beamToken } = await loadFixture(deployFixture);
      expect(await beamToken.read.name()).to.equal(beamTokenName);
    });

    it("Should set the right symbol", async () => {
      const { beamToken } = await loadFixture(deployFixture);
      expect(await beamToken.read.symbol()).to.equal(beamTokenSymbol);
    });

    it("Should have 18 decimals", async () => {
      const { beamToken } = await loadFixture(deployFixture);
      expect(await beamToken.read.decimals()).to.equal(18);
    });

    it("Should have 0 total supply", async () => {
      const { beamToken } = await loadFixture(deployFixture);
      expect(await beamToken.read.totalSupply()).to.equal(0n);
    });

    it("Should have deployer has minter", async () => {
      const { beamToken, deployerAddress } = await loadFixture(deployFixture);
      expect(getAddress(await beamToken.read.minter())).to.equal(deployerAddress);
    });
  });

  describe("Mint", () => {
    it("Should allow minter to mint to specified account", async () => {
      const { beamToken, deployerAddress, otherAccountAddress } = await loadFixture(deployFixture);
      const amount = 42n;
      await beamToken.write.mint([otherAccountAddress, amount]);
      expect(await beamToken.read.balanceOf([otherAccountAddress])).to.equal(amount);
      expect(await beamToken.read.totalSupply()).to.equal(amount);

      const otherAmount = 69n;
      await beamToken.write.mint([deployerAddress, otherAmount]);
      expect(await beamToken.read.balanceOf([deployerAddress])).to.equal(otherAmount);
      expect(await beamToken.read.totalSupply()).to.equal(amount + otherAmount);
    });

    it("Should allow minter to set minter", async () => {
      const { beamToken, otherAccountAddress } = await loadFixture(deployFixture);
      await beamToken.write.setMinter([otherAccountAddress]);

      expect(getAddress(await beamToken.read.minter())).to.equal(otherAccountAddress);
    });

    it("Should prevent other accounts to mint", async () => {
      const { beamToken, otherAccount, otherAccountAddress } = await loadFixture(deployFixture);
      await expect(beamToken.write.mint([otherAccountAddress, 42n], { account: otherAccount.account })).to.be.rejected;
    });

    it("Should prevent other accounts to set minter", async () => {
      const { beamToken, otherAccount, otherAccountAddress } = await loadFixture(deployFixture);
      await expect(beamToken.write.setMinter([otherAccountAddress], { account: otherAccount.account })).to.be.rejected;
    });
  });
});
