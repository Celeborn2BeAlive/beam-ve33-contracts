import hre, { ignition } from "hardhat";
import { Address, getAddress } from "viem";
import { INITIAL_BEAM_TOKEN_SUPPLY, isHardhatNetwork, POOL_TYPE_ALGEBRA } from "./constants";
import { loadFixture } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { expect } from "chai";
import { create10PercentOfTotalSupplyLock, simulateOneWeekAndFlipEpoch } from "./utils";
import BeamProtocol from "../ignition/modules/BeamProtocol";


describe("BeamCore.EpochDistributor", () => {
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

    const { beamToken, minterProxy, epochDistributorProxy, voter, claimer, votingEscrow } = beam;
    const { globalFactory, algebraVaultFactory, gaugeFactory, votingIncentivesFactory } = beam;

    // Deploy test tokens
    const USDC = await hre.viem.deployContract("ERC20PresetMinterPauser", ["USDC", "USDC"]);
    await USDC.write.mint([deployerAddress, 10_000_000_000n]);
    const WETH = await hre.viem.deployContract("ERC20PresetMinterPauser", ["Wrapped Ether", "WETH"]);
    await WETH.write.mint([deployerAddress, 42_000_000n]);

    // Mocking Algebra DEX with TestAlgebraFactory and creating pools which are TestAlgebraPool instances
    const testAlgebraFactory = await hre.viem.deployContract("TestAlgebraFactory");
    await testAlgebraFactory.write.createPool([USDC.address, WETH.address]);
    await testAlgebraFactory.write.createPool([beamToken.address, WETH.address]);
    await testAlgebraFactory.write.createPool([beamToken.address, USDC.address]);
    const USDC_BEAM = await testAlgebraFactory.read.poolByPair([beamToken.address, USDC.address]);
    const WETH_BEAM = await testAlgebraFactory.read.poolByPair([beamToken.address, WETH.address]);
    const WETH_USDC = await testAlgebraFactory.read.poolByPair([USDC.address, WETH.address]);

    const pools = {
      USDC_BEAM,
      WETH_BEAM,
      WETH_USDC,
    };

    // Create AlgebraVault and set as communityVault for each pool
    Object.values(pools).forEach(async (poolAddr) => {
      await algebraVaultFactory.write.createVaultForPool([poolAddr]);
      const vaultAddr = await algebraVaultFactory.read.getVaultForPool([poolAddr]);
      const pool = await hre.viem.getContractAt("TestAlgebraPool", poolAddr);
      await pool.write.setCommunityVault([vaultAddr]);
    });

    // Setup GlobalFactory for test
    const testIncentiveMaker = await hre.viem.deployContract("TestIncentiveMaker", [beamToken.address]);

    await globalFactory.write.setIncentiveMaker([testIncentiveMaker.address]);
    await globalFactory.write.setPairFactoryAlgebra([testAlgebraFactory.address]);

    // Tokens need to be whitelisted for gauge creation:
    await globalFactory.write.addToken([[USDC.address, WETH.address, beamToken.address]]);
    // Algebra pool type should be enabled:
    await globalFactory.write.setPoolType([POOL_TYPE_ALGEBRA, true]);
    // Only allowed addresses can create gauges:
    await globalFactory.write.setPoolTypeCreator([POOL_TYPE_ALGEBRA, true, deployerAddress]);

    // Create gauge for each pool
    Object.values(pools).forEach(async (poolAddr) => {
      await globalFactory.write.create([poolAddr, POOL_TYPE_ALGEBRA]);
    });

    // The Minter requires a non zero total supply or division by zero occurs in `calculate_rebase`:
    await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
    await beamToken.write.setMinter([minterProxy.address]);

    // Set 0% emission to rebase and team to ease computation
    await minterProxy.write.setRebase([0n]);
    await minterProxy.write.setTeamRate([0n]);

    await minterProxy.write._initialize([[], [], 0n]);
    const activePeriod = await minterProxy.read.active_period();

    const veNFTId = await create10PercentOfTotalSupplyLock(beamToken, votingEscrow);

    return {
      publicClient,
      deployer,
      user,
      deployerAddress,
      testIncentiveMaker,
      activePeriod,
      veNFTId,
      USDC,
      WETH,
      ...beam,
      pools,
    };
  };

  it("Should distribute farming rewards to gauges", async () => {
    const { deployerAddress, minterProxy, activePeriod, beamToken, epochDistributorProxy, testIncentiveMaker, voter, veNFTId, pools } = await loadFixture(deployFixture);

    const votes = {
      [pools.USDC_BEAM]: 50n,
      [pools.WETH_BEAM]: 35n,
      [pools.WETH_USDC]: 15n,
    } as {[key: Address]: bigint};

    await voter.write.vote([veNFTId, Object.keys(votes) as [Address], Object.values(votes)]);

    await simulateOneWeekAndFlipEpoch(minterProxy);

    const expectedEmission = await minterProxy.read.weekly();

    expect(await beamToken.read.balanceOf([epochDistributorProxy.address])).to.equals(expectedEmission);

    const [amountEpoch0, totalWeightsEpoch0, timestampEpoch0, poolsLengthEpoch0] = await epochDistributorProxy.read.amountsPerEpoch([0n]);

    expect(amountEpoch0).to.equals(expectedEmission);
    expect(timestampEpoch0).to.equals(activePeriod);
    expect(totalWeightsEpoch0).to.equals(await voter.read.totalWeights([activePeriod]));
    expect(poolsLengthEpoch0).to.equals(3n);

    await epochDistributorProxy.write.setAutomation([deployerAddress, true]);
    await epochDistributorProxy.write.distributeAll();

    // We expect a small token lefhover in the epoch distributor because of integer division
    const lefthoverAmount = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    const distributedAmount = await beamToken.read.balanceOf([testIncentiveMaker.address]);
    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    Object.entries(votes).forEach(async ([poolAddr, vote]) => {
      expect(await testIncentiveMaker.read.poolAmount([poolAddr as Address])).to.equals(
        distributedAmount * vote / 100n
      );
    });
  });
});
