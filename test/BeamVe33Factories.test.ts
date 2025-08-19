import hre, { ignition } from "hardhat";
import { getAddress } from "viem";
import { isHardhatNetwork } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import BeamProtocol from "../ignition/modules/BeamProtocol";

describe("BeamVe33Factories", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(BeamProtocol);

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      ...beam,
    };
  };

  describe("GlobalFactory", () => {
    it("Should be connected to VotingIncentivesFactory", async () => {
      const { globalFactory, votingIncentivesFactory } = await loadFixture(deployFixture);

      expect(await votingIncentivesFactory.read.globalFactory()).to.equals(globalFactory.address);
    });

    it("Should be connected to GaugeFactory", async () => {
      const { globalFactory, gaugeFactory } = await loadFixture(deployFixture);

      expect(await gaugeFactory.read.globalFactory()).to.equals(globalFactory.address);
    });

    it("Should be manager of Voter", async () => {
      const { globalFactory, voter } = await loadFixture(deployFixture);
      expect(await voter.read.isManager([globalFactory.address])).to.equals(true);
    });
  });
});
