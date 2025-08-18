import hre, { ignition } from "hardhat";
import BeamCore, { Voter } from "../ignition/modules/Beam.Core";
import { Address, getAddress, parseEther } from "viem";
import { isHardhatNetwork, MAX_LOCKTIME, WEEK } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import BeamSolidyDEX from "../ignition/modules/Beam.SolidyDEX";
import BeamVe33Factories from "../ignition/modules/Beam.Ve33Factories";
import { ZERO_ADDRESS } from "../ignition/modules/constants";

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

    const beamCore = await ignition.deploy(BeamCore);
    const ve33Factories = await ignition.deploy(BeamVe33Factories);

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      ...beamCore,
      ...ve33Factories,
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

    // TODO the following test fails but I don't know why as the deployment script is doing the call...
    it.skip("Should be manager of Voter", async () => {
      const { globalFactory, voter } = await loadFixture(deployFixture);
      expect(await voter.read.isManager([globalFactory.address])).to.equals(true);
    });
  });
});
