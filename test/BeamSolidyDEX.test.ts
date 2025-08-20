import hre, { ignition } from "hardhat";
import { getAddress } from "viem";
import { isHardhatNetwork } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import BeamSolidyDEX from "../ignition/modules/Beam.SolidyDEX";
import { ZERO_ADDRESS } from "../ignition/modules/constants";

describe("BeamSolidlyDEX", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const solidlyDex = await ignition.deploy(BeamSolidyDEX);

    const USDC = await hre.viem.deployContract("ERC20PresetMinterPauser", ["USDC", "USDC"]);
    await USDC.write.mint([deployerAddress, 10_000_000_000n]);
    const USDT = await hre.viem.deployContract("ERC20PresetMinterPauser", ["USDT", "USDT"]);
    await USDT.write.mint([deployerAddress, 10_000_000_000n]);
    const WETH = await hre.viem.deployContract("ERC20PresetMinterPauser", ["Wrapped Ether", "WETH"]);
    await WETH.write.mint([deployerAddress, 42_000_000n]);

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      ...solidlyDex,
      tokens: {
        USDC,
        USDT,
        WETH,
      },
    };
  };

  describe("PairFactory", () => {
    it("Should report non existing pairs", async () => {
      const { solidlyPairFactoryProxy, tokens } = await loadFixture(deployFixture);
      const { WETH, USDC } = tokens;

      const WETH_USDC = await solidlyPairFactoryProxy.read.getPair([USDC.address, WETH.address, false]);
      expect(WETH_USDC).to.equals(ZERO_ADDRESS);
      expect(await solidlyPairFactoryProxy.read.isPair([WETH_USDC])).to.be.false;
    });

    it("Should create volatile pair", async () => {
      const { solidlyPairFactoryProxy, tokens } = await loadFixture(deployFixture);
      const { WETH, USDC } = tokens;

      await solidlyPairFactoryProxy.write.createPair([WETH.address, USDC.address, false]);
      const WETH_USDC = await solidlyPairFactoryProxy.read.getPair([USDC.address, WETH.address, false]);

      expect(WETH_USDC != ZERO_ADDRESS).to.be.true;
      expect(await solidlyPairFactoryProxy.read.isPair([WETH_USDC])).to.be.true;
    });

    it("Should create stable pair", async () => {
      const { solidlyPairFactoryProxy, tokens } = await loadFixture(deployFixture);
      const { USDT, USDC } = tokens;

      await solidlyPairFactoryProxy.write.createPair([USDC.address, USDT.address, true]);
      const USDC_USDT = await solidlyPairFactoryProxy.read.getPair([USDC.address, USDT.address, true]);

      expect(USDC_USDT != ZERO_ADDRESS).to.be.true;
      expect(await solidlyPairFactoryProxy.read.isPair([USDC_USDT])).to.be.true;
    });
  });
});
