import { BeamToken, beamTokenName, beamTokenSymbol } from "../ignition/modules/Beam";
import hre, { ignition } from "hardhat";
import { expect } from "chai";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { getAddress, parseEther } from "viem";

const EXPECTED_INITIAL_MINT_AMOUNT = parseEther("50000000");

describe("BeamToken", () => {
  const deployFixture = async () => {
    const [deployer, otherAccount] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const otherAccountAddress = getAddress(otherAccount.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const { beamToken } = await ignition.deploy(BeamToken);

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

    it("Should not be initial minted", async () => {
      const { beamToken } = await loadFixture(deployFixture);
      expect(await beamToken.read.initialMinted()).to.equal(false);
    });

    it("Should have deployer has minter", async () => {
      const { beamToken, deployerAddress } = await loadFixture(deployFixture);
      expect(getAddress(await beamToken.read.minter())).to.equal(deployerAddress);
    });
  });

  describe("Initial mint", () => {
    it("Should only initial mint only once", async () => {
      const { beamToken, deployerAddress } = await loadFixture(deployFixture);
      await beamToken.write.initialMint([deployerAddress]);
      await expect(beamToken.write.initialMint([deployerAddress])).to.be.rejectedWith("");
    });

    it("Should initial mint 50M to specified address", async () => {
      const { beamToken, otherAccountAddress } = await loadFixture(deployFixture);
      await beamToken.write.initialMint([otherAccountAddress]);
      expect(await beamToken.read.balanceOf([otherAccountAddress])).to.equal(EXPECTED_INITIAL_MINT_AMOUNT);
      expect(await beamToken.read.totalSupply()).to.equal(EXPECTED_INITIAL_MINT_AMOUNT);
    });

    it("Should prevent initial mint from other account", async () => {
      const { beamToken, otherAccount, otherAccountAddress } = await loadFixture(deployFixture);
      await expect(beamToken.write.initialMint([otherAccountAddress], { account: otherAccount.account })).to.be.rejectedWith("");
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
      await expect(beamToken.write.mint([otherAccountAddress, 42n], { account: otherAccount.account })).to.be.rejectedWith("not allowed");
    });

    it("Should prevent other accounts to set minter", async () => {
      const { beamToken, otherAccount, otherAccountAddress } = await loadFixture(deployFixture);
      await expect(beamToken.write.setMinter([otherAccountAddress], { account: otherAccount.account })).to.be.rejectedWith("");
    });
  });

  describe("Events", () => {
    const initialMintFixture = async () => {
      const { beamToken, deployerAddress } = await loadFixture(deployFixture);
      await beamToken.write.initialMint([deployerAddress]);
    };

    it("Should emit an event on approvals", async () => {
      const { beamToken, deployerAddress, otherAccountAddress } = await loadFixture(deployFixture);
      await loadFixture(initialMintFixture);

      const amount = 12n;
      await beamToken.write.approve([otherAccountAddress, amount]);

      const events = await beamToken.getEvents.Approval();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.owner).to.equal(deployerAddress);
      expect(events[0].args.spender).to.equal(otherAccountAddress);
      expect(events[0].args.value).to.equal(amount);
    })

    it("Should emit an event on transfer", async () => {
      const { beamToken, deployerAddress, otherAccountAddress } = await loadFixture(deployFixture);
      await loadFixture(initialMintFixture);

      const amount = 12n;
      await beamToken.write.transfer([otherAccountAddress, amount]);

      const events = await beamToken.getEvents.Transfer();
      expect(events).to.have.lengthOf(1);
      expect(events[0].args.from).to.equal(deployerAddress);
      expect(events[0].args.to).to.equal(otherAccountAddress);
      expect(events[0].args.value).to.equal(amount);
    })
  })
});
