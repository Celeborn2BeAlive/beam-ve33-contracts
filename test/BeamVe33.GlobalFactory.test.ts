import hre, { ignition } from "hardhat";
import { getAddress } from "viem";
import { isHardhatNetwork } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { createGauge, CreateGaugeResult, getPairs, TestTokens } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TestProtocol = buildModule("TestProtocol", (m) => {
  const beam = m.useModule(BeamProtocol);
  const tokens = m.useModule(TestTokens);
  return {
    ...beam,
    ...tokens,
  }
});

describe("BeamVe33.GlobalFactory", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer, farmer] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const farmerAddress = getAddress(farmer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const { WETH, USDC, ...beam } = await ignition.deploy(TestProtocol);

    return {
      publicClient,
      deployer,
      farmer,
      deployerAddress,
      farmerAddress,
      tokens: [
        USDC,
        WETH,
        beam.beamToken,
      ],
      ...beam,
    };
  };

  it("Should create pool, gauge, votingIncentives and add data to Voter", async () => {
    const { globalFactory, voter, solidlyPairFactoryProxy, tokens } = await loadFixture(deployFixture)

    const POOL_TYPE_SOLIDLY = await globalFactory.read.POOL_TYPE_SOLIDLY();
    await globalFactory.write.setPoolType([POOL_TYPE_SOLIDLY, true]);
    const allTokenAddrs = tokens.map(({address}) => address);
    await globalFactory.write.addToken([allTokenAddrs]);

    const solidlyPools = [] as CreateGaugeResult[];
    for (const [token0, token1] of getPairs(tokens)) {
      await solidlyPairFactoryProxy.write.createPair([token0.address, token1.address, false]);
      const result = await createGauge({
        poolAddr: await solidlyPairFactoryProxy.read.getPair([token0.address, token1.address, false]),
        poolType: POOL_TYPE_SOLIDLY,
        voter,
        globalFactory,
      });
      solidlyPools.push(result);
    }

    expect(await voter.read.poolsLength()).to.equals(BigInt(solidlyPools.length));
    for (const {
        poolAddr,
        gaugeAddr,
        votingIncentivesAddr,
    } of solidlyPools) {
      expect(await voter.read.isPool([poolAddr])).to.be.true;
      const poolData = await voter.read.poolData([poolAddr]);
      expect(poolData.gauge).to.equals(gaugeAddr);
      expect(poolData.votingIncentives).to.equals(votingIncentivesAddr);
      expect(await voter.read.poolTotalWeights([poolAddr, await voter.read.epochTimestamp()])).to.equals(0n);
    }
  });

  it.only("Should add and remove reward token from Gauge", async () => {
    const { globalFactory, voter, solidlyPairFactoryProxy, tokens, gaugeFactory } = await loadFixture(deployFixture)

    const POOL_TYPE_SOLIDLY = await globalFactory.read.POOL_TYPE_SOLIDLY();
    await globalFactory.write.setPoolType([POOL_TYPE_SOLIDLY, true]);

    const [token0, token1] = tokens;
    await globalFactory.write.addToken([[token0.address, token1.address]]);

    await solidlyPairFactoryProxy.write.createPair([token0.address, token1.address, false]);
    const result = await createGauge({
      poolAddr: await solidlyPairFactoryProxy.read.getPair([token0.address, token1.address, false]),
      poolType: POOL_TYPE_SOLIDLY,
      voter,
      globalFactory,
    });

    await gaugeFactory.write.addRewardToken([result.gaugeAddr, token0.address]);
    const gauge = await hre.viem.getContractAt("Gauge", result.gaugeAddr);
    expect(await gauge.read.isRewardToken([token0.address,])).to.be.true;

    await gaugeFactory.write.removeRewardToken([result.gaugeAddr, token0.address]);
    expect(await gauge.read.isRewardToken([token0.address,])).to.be.false;
  });
});
