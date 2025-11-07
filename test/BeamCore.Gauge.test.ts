import hre, { ignition } from "hardhat";
import { getAddress, parseEther } from "viem";
import { isHardhatNetwork } from "./constants";
import { impersonateAccount, loadFixture, mine, setBalance, time } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { addLiquidityAndStakeForFarming, createGauge, TestTokens } from "./utils";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const TestProtocol = buildModule("TestProtocol", (m) => {
  const beam = m.useModule(BeamProtocol);
  const tokens = m.useModule(TestTokens);

  return {
    ...beam,
    ...tokens,
  }
});

describe("BeamCore.Gauge", () => {
  before(async function () {
    if (!isHardhatNetwork) {
      this.skip();
    }
  });

  const deployFixture = async () => {
    const [deployer] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);

    const testProtocol = await ignition.deploy(TestProtocol);

    return {
      deployer,
      deployerAddress,
      ...testProtocol,
    };
  };

  const createPoolGaugeAndAddLiquidityForFarmingFixture = async () => {
    const { deployerAddress, beamToken, voter, epochDistributorProxy, globalFactory, solidlyPairFactoryProxy, solidlyRouter, WETH, USDC } = await loadFixture(deployFixture);
    const publicClient = await hre.viem.getPublicClient();

    // Create a pool, gauge, and add liquidity for farming
    await solidlyPairFactoryProxy.write.createPair([WETH.address, USDC.address, false]);
    const poolAddr = await solidlyPairFactoryProxy.read.getPair([WETH.address, USDC.address, false]);

    const POOL_TYPE_SOLIDLY = await globalFactory.read.POOL_TYPE_SOLIDLY();
    await globalFactory.write.setPoolType([POOL_TYPE_SOLIDLY, true]);
    await globalFactory.write.addToken([[WETH.address, USDC.address]]);

    const { gaugeAddr } = await createGauge({
      poolAddr,
      poolType: POOL_TYPE_SOLIDLY,
      voter,
      globalFactory,
    });
    await addLiquidityAndStakeForFarming({
      deployerAddress,
      farmerAddress: deployerAddress,
      solidlyRouter,
      publicClient,
      solidlyPools: [{poolAddr, gaugeAddr}],
    })
    const gauge = await hre.viem.getContractAt("Gauge", gaugeAddr);

    return {
      beamToken,
      gauge,
      epochDistributorProxy,
      publicClient,
      deployerAddress,
    };
  };

  it("Should avoid precision loss causing less reward distribution", async () => {
    // Fix audit issue#129 [ve(3,3)] Precision loss causes less reward distribution in Gauge
    // => Gauge is responsible for distribution of emission tokens and other extra rewards published by managers. In notifyRewardAmount function _rewardRate is calculated without adding an extra precision.

    // The fix add an extra precision multiplier of 1e18
    // The test ensure the fix is applied and that a single farmer user is able to farm all the rewards during the duration

    const {
      beamToken,
      gauge,
      epochDistributorProxy,
      publicClient,
      deployerAddress,
    } = await loadFixture(createPoolGaugeAndAddLiquidityForFarmingFixture);

    // Mint reward for the gauge
    const duration = await gauge.read.DURATION();
    const rewardAmount = duration - 1n; // 1 unit less than duration to check the division by duration for the reward rate does not loose reward anymore
    await beamToken.write.mint([gauge.address, rewardAmount]);

    // Notify rewards using the epoch distributor address (only it can call the function)
    await impersonateAccount(epochDistributorProxy.address);
    await setBalance(epochDistributorProxy.address, parseEther("1"));
    await gauge.write.notifyRewardAmount([beamToken.address, rewardAmount],
      {
        account: epochDistributorProxy.address,
      }
    );
    const periodStart = (await publicClient.getBlock()).timestamp; // Start of the farming period

    const precisionMultiplier = await gauge.read.PRECISION_MULTIPLIER();
    expect(await gauge.read.rewardRate([beamToken.address]) > 0n, "Reward rate is 0").to.be.true; // Before the fix this would be 0
    expect(await gauge.read.rewardRate([beamToken.address])).to.equal(
      rewardAmount * precisionMultiplier / duration
    ); // Ensure the multiplier is applied

    // We cannot totally avoid precision loss because of integer divisions. In this specific case we have:
    // duration = 604800
    // precisionMultiplier = 1e18
    // rewardAmount = duration - 1
    // rewardRate = rewardAmount * precisionMultiplier // duration -> 999998346560846560
    // rewardForDuration = rewardRate * duration // precisionMultiplier -> 604798
    // while we expect to get back rewardAmount, we loose one unit of precision here
    // it means we can still loose dusty amounts of tokens despite the fix, but we consider such loss to be negligible
    const rewardForDuration = rewardAmount - 1n;
    expect(await gauge.read.rewardForDuration([beamToken.address])).to.equal(rewardForDuration);

    // Farming for half the duration
    await time.setNextBlockTimestamp(periodStart + duration / 2n);
    await mine();
    expect(await gauge.read.earned([deployerAddress, beamToken.address]) > 0n).to.be.true; // Expect to farm something
    expect(rewardAmount - await gauge.read.earned([deployerAddress, beamToken.address]) >= rewardForDuration / 2n).to.be.true; // Expect no more than 50% rewards farm

    // Farming for total duration
    await time.setNextBlockTimestamp(periodStart + duration);
    await mine();
    expect(await gauge.read.earned([deployerAddress, beamToken.address])).to.equals(rewardForDuration); // Expect all rewards to be farmed

    // Farming for more than the total duration
    await time.setNextBlockTimestamp(periodStart + 2n * duration);
    await mine();
    expect(await gauge.read.earned([deployerAddress, beamToken.address])).to.equals(rewardForDuration); // Still expect same amount of rewards farmed
  });
});
