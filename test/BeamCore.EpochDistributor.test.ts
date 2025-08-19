import hre, { ignition } from "hardhat";
import { Address, getAddress } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork, POOL_TYPE_ALGEBRA } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { create10PercentOfTotalSupplyLock, simulateOneWeekAndFlipEpoch } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";
import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";
import { ZERO_ADDRESS } from "../ignition/modules/constants";

const TestTokens = buildModule("TestTokens", (m) => {
  const USDC = m.contract("ERC20PresetMinterPauser", ["USDC", "USDC"], { id: "USDC"});
  m.call(USDC, "mint", [m.getAccount(0), 10_000_000_000n]);
  const WETH = m.contract("ERC20PresetMinterPauser", ["Wrapped Ether", "WETH"], { id: "WETH"});
  m.call(WETH, "mint", [m.getAccount(0), 42_000_000n]);

  return {
    USDC,
    WETH,
  }
});

const TestAlgebraFactory = buildModule("TestAlgebraFactory", (m) => {
  const { beamToken } = m.useModule(BeamProtocol);
  const { USDC, WETH } = m.useModule(TestTokens);

  // Mocking Algebra DEX with TestAlgebraFactory and creating pools which are TestAlgebraPool instances
  const algebraFactory = m.contract("TestAlgebraFactory");

  m.call(algebraFactory, "createPool", [USDC, WETH], {id: "createPool_USDC_WETH"});
  m.call(algebraFactory, "createPool", [USDC, beamToken], {id: "createPool_USDC_BEAM"});
  m.call(algebraFactory, "createPool", [beamToken, WETH], {id: "createPool_BEAM_WETH"});

  return { algebraFactory };
});

const TestIncentiveMaker = buildModule("TestIncentiveMaker", (m) => {
  const { beamToken } = m.useModule(BeamProtocol);
  const incentiveMaker = m.contract("TestIncentiveMaker", [beamToken]);
  return { incentiveMaker };
});

const TestProtocol = buildModule("TestProtocol", (m) => {
  const beam = m.useModule(BeamProtocol);
  const tokens = m.useModule(TestTokens);
  const { algebraFactory } = m.useModule(TestAlgebraFactory);
  const { incentiveMaker } = m.useModule(TestIncentiveMaker);

  const { globalFactory } = beam;
  m.call(globalFactory, "setIncentiveMaker", [incentiveMaker]);
  m.call(globalFactory, "setPairFactoryAlgebra", [algebraFactory]);

  return {
    ...beam,
    ...tokens,
    algebraFactory,
    incentiveMaker,
  }
});

describe("BeamCore.EpochDistributor", () => {
  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(TestProtocol);

    const { beamToken, minterProxy, epochDistributorProxy, voter, claimer, votingEscrow } = beam;
    const { globalFactory, algebraVaultFactory, gaugeFactory, votingIncentivesFactory } = beam;

    // Deploy test tokens
    const { USDC, WETH, algebraFactory } = beam;

    const USDC_BEAM = await algebraFactory.read.poolByPair([beamToken.address, USDC.address]);
    const WETH_BEAM = await algebraFactory.read.poolByPair([beamToken.address, WETH.address]);
    const WETH_USDC = await algebraFactory.read.poolByPair([USDC.address, WETH.address]);

    const pools = {
      USDC_BEAM,
      WETH_BEAM,
      WETH_USDC,
    };

    // Create AlgebraVault and set as communityVault for each pool
    for (const poolAddr of Object.values(pools)) {
      {
        const vaultAddr = await algebraVaultFactory.read.getVaultForPool([poolAddr]);
        if (vaultAddr != ZERO_ADDRESS) {
          console.log(`Vault for pool ${poolAddr} already deployed at ${vaultAddr}`);
          continue;
        }
      }

      await algebraVaultFactory.write.createVaultForPool([poolAddr]);
      const vaultAddr = await algebraVaultFactory.read.getVaultForPool([poolAddr]);
      const pool = await hre.viem.getContractAt("TestAlgebraPool", poolAddr);
      await pool.write.setCommunityVault([vaultAddr]);
    }

    // Tokens need to be whitelisted for gauge creation:
    await globalFactory.write.addToken([[USDC.address, WETH.address]]);

    // Create gauge for each pool
    for (const poolAddr of Object.values(pools)) {
      if(await voter.read.isPool([poolAddr])) {
        console.log(`Pool ${poolAddr} already registered on Voter`);
        continue;
      }

      await globalFactory.write.create([poolAddr, POOL_TYPE_ALGEBRA]);
    }

    if (await beamToken.read.minter() != minterProxy.address) {
      // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
      await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
      await beamToken.write.setMinter([minterProxy.address]);

      // Set 0% emission to rebase and team to ease computation
      await minterProxy.write.setRebase([0n]);
      await minterProxy.write.setTeamRate([0n]);

      await minterProxy.write._initialize([[], [], 0n]);

      await create10PercentOfTotalSupplyLock(beamToken, votingEscrow);
    } else {
      console.log(`Minter already initialized`);
    }
    const veNFTId = await votingEscrow.read.tokenOfOwnerByIndex([deployerAddress, 0n]);
    const activePeriod = await minterProxy.read.active_period();

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      activePeriod,
      veNFTId,
      ...beam,
      pools,
    };
  };

  it("Should distribute farming rewards to gauges", async () => {
    const { deployerAddress, minterProxy, activePeriod, beamToken, epochDistributorProxy, incentiveMaker, voter, veNFTId, pools } = await loadFixture(deployFixture);

    const votes = {
      [pools.USDC_BEAM]: 50n,
      [pools.WETH_BEAM]: 35n,
      [pools.WETH_USDC]: 15n,
    } as {[key: Address]: bigint};

    await voter.write.vote([veNFTId, Object.keys(votes) as [Address], Object.values(votes)]);

    const balanceOfDistributorBeforeEpochFlip = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    await epochDistributorProxy.write.emergencyRecoverERC20([beamToken.address, balanceOfDistributorBeforeEpochFlip]);
    expect(await beamToken.read.balanceOf([epochDistributorProxy.address])).to.equals(0n);

    await simulateOneWeekAndFlipEpoch(minterProxy);

    const expectedEmission = await minterProxy.read.weekly();

    // All token goes to epochDistributor because we set teamRate and rebaseRate to 0 at deploy time
    const balanceOfDistributorAfterEpochFlip = await beamToken.read.balanceOf([epochDistributorProxy.address]);

    expect(balanceOfDistributorAfterEpochFlip).to.equals(expectedEmission);

    const currentEpoch = await epochDistributorProxy.read.currentEpoch();
    const [amountEpoch0, totalWeightsEpoch0, timestampEpoch0, poolsLengthEpoch0] = await epochDistributorProxy.read.amountsPerEpoch([currentEpoch]);

    expect(amountEpoch0).to.equals(expectedEmission);
    expect(timestampEpoch0).to.equals(activePeriod);
    expect(totalWeightsEpoch0).to.equals(await voter.read.totalWeights([activePeriod]));
    expect(poolsLengthEpoch0).to.equals(3n);

    for (const poolAddr of Object.values(pools)) {
      await incentiveMaker.write.resetIncentive([poolAddr]);
    }
    await incentiveMaker.write.recoverTokens();
    expect(await beamToken.read.balanceOf([incentiveMaker.address])).to.equals(0n);

    await epochDistributorProxy.write.setAutomation([deployerAddress, true]);
    await epochDistributorProxy.write.distributeAll();

    // We expect a small token lefhover in the epoch distributor because of integer division
    const lefthoverAmount = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    const distributedAmount = await beamToken.read.balanceOf([incentiveMaker.address]);

    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    for (const [poolAddr, vote] of Object.entries(votes)) {
      const rewardAmount = await incentiveMaker.read.poolAmount([poolAddr as Address]);
      const expectedRewardAmount = distributedAmount * vote / 100n;
      const delta = (rewardAmount >= expectedRewardAmount) ? rewardAmount - expectedRewardAmount : expectedRewardAmount - rewardAmount;
      expect(delta < 10).to.be.true; // 10 wei delta check
    }
  });
});
