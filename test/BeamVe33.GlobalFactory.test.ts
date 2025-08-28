import hre, { ignition } from "hardhat";
import { Address, getAddress, parseUnits, PublicClient } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork } from "./constants";
import { loadFixture, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { addLiquidityAndStakeForFarming, addVotingIncentives, create10PercentOfTotalSupplyLock, createGaugeForSolidlyPoolWithGlobalFactory, simulateOneWeek, simulateOneWeekAndFlipEpoch, TestTokens } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { EmissionTokenContract, ERC20PresetMinterPauserContract, SolidlyRouterContract } from "./types";
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
    const { globalFactory, voter, solidlyPairFactoryProxy, beamToken, tokens } = await loadFixture(deployFixture)

    await globalFactory.write.setPoolType([await globalFactory.read.POOL_TYPE_SOLIDLY(), true]);
    const allTokenAddrs = tokens.map(({address}) => address);
    await globalFactory.write.addToken([allTokenAddrs]);

    const solidlyPools = [];
    for (let token0Idx = 0; token0Idx < tokens.length; ++token0Idx) {
      const token0 = tokens[token0Idx];
      for (let token1Idx = token0Idx + 1; token1Idx < tokens.length; ++token1Idx) {
        const token1 = tokens[token1Idx];
        await solidlyPairFactoryProxy.write.createPair([token0.address, token1.address, false]);
        const result = await createGaugeForSolidlyPoolWithGlobalFactory({
          poolAddr: await solidlyPairFactoryProxy.read.getPair([token0.address, token1.address, false]),
          globalFactory,
        });
        solidlyPools.push(result);
      }
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
});
