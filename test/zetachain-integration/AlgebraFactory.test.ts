import hre, { ignition } from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress, ZERO_ADDRESS } from "../../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount, loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import BeamCore, { Voter } from "../../ignition/modules/Beam.Core";
import { IGNITION_DEPLOYMENTS_ROOT, isLocalhostNetwork, MAX_LOCKTIME, WEEK } from "../constants";
import fs from "node:fs";
import BeamVe33Factories from "../../ignition/modules/Beam.Ve33Factories";
import { formatEther, getAddress, parseEther, getContract, Address } from "viem";
import { ABI_WZETA } from "../abi/WZETA";
import { ABI_AlgebraFactory } from "../abi/AlgebraFactory";

const deploymentId = "test";

const algebraSwapRouterAddress = getAddress("0x84A5509Dce0b68C73B89e67454C30912293c7ea0");
const algebraEternalFarmingAddress = getAddress("0xe310Ce3A6382E522e4d988735b2De13b35E30149");

const WZETA = getAddress("0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf");
const SOL_SOL = getAddress("0x4bc32034caccc9b7e02536945edbc286bacba073");
const ETH_ETH = getAddress("0xd97b1de3619ed2c6beb3860147e30ca8a7dc9891");
const BTC_BTC = getAddress("0x13a0c5930c028511dc02665e7285134b6d11a5f4");

const COMMUNITY_FEE_TRANSFER_FREQUENCY = 8n * 24n * 3600n; // 8 hours

const INITIAL_BEAM_TOKEN_SUPPLY = parseEther("50000000");
const POOL_TYPE_ALGEBRA = 2;

describe("AlgebraFactory", function() {
  before(async function () {
    if (!isLocalhostNetwork) {
      this.skip();
    }
    await impersonateAccount(beamMultisigAddress);
  });

  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    fs.rmSync(`${IGNITION_DEPLOYMENTS_ROOT}/${deploymentId}`, { recursive: true, force: true });

    const beamCore = await ignition.deploy(BeamCore, {
      deploymentId
    });
    const ve33Factories = await ignition.deploy(BeamVe33Factories, {
      deploymentId
    });

    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    const algebraEternalFarming = await hre.viem.getContractAt("IAlgebraEternalFarming", algebraEternalFarmingAddress);

    const { beamToken, minterProxy, epochDistributorProxy, voter, claimer, votingEscrow } = beamCore;
    const { globalFactory, incentiveMakerProxy } = ve33Factories;

    // Initialize Beam protocol and link it to Algebra Farming:

    // Allow to create gauges for AlgebraPool using the deployer address
    await globalFactory.write.setPoolType([POOL_TYPE_ALGEBRA, true]);
    await globalFactory.write.setPoolTypeCreator([POOL_TYPE_ALGEBRA, true, deployerAddress]);

    // Assign INCENTIVE_MAKER_ROLE to our IncentiveMaker contract instance,
    // which is required for it to be able to create Algebra Eternal Farming campaigns
    const incentiveMakerRole = await algebraEternalFarming.read.INCENTIVE_MAKER_ROLE();
    await deployer.writeContract(
      {
        address: algebraFactory.address,
        abi: ABI_AlgebraFactory,
        functionName: "grantRole",
        args: [incentiveMakerRole, incentiveMakerProxy.address],
        account: beamMultisigAddress,
      },
    );

    // Initialize the IncentiveMaker so it's connected to Algebra farming
    await incentiveMakerProxy.write._initialize([algebraEternalFarming.address, voter.address]);

    // Mint initial tokens and set minter
    await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
    await beamToken.write.setMinter([minterProxy.address]);

    // Set minter config and initialize it
    await minterProxy.write.setRebase([0n]);
    await minterProxy.write.setTeamRate([0n]);
    await minterProxy.write._initialize([[], [], 0n]);
    const activePeriod = await minterProxy.read.active_period();

    // Lock 10% of total supply
    const totalSupply = await beamToken.read.totalSupply();
    const depositAmount = totalSupply / 10n;
    await beamToken.write.approve([votingEscrow.address, depositAmount]);

    await votingEscrow.write.create_lock([depositAmount, MAX_LOCKTIME]);
    const events = await votingEscrow.getEvents.Transfer();
    const veNFTId = events[0].args.tokenId as bigint;

    return {
      deployer,
      deployerAddress,
      user,
      publicClient,
      ...beamCore,
      ...ve33Factories,
      algebraFactory,
      algebraEternalFarming,
      activePeriod,
      veNFTId,
    }
  };

  const simulateOneWeek = async (activePeriod: bigint) => {
    const nextPeriod = activePeriod + WEEK;
    await time.setNextBlockTimestamp(activePeriod + WEEK);
    return { nextPeriod };
  };

  it("Should have Beam multisig has owner", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    expect(await algebraFactory.read.owner()).to.equal(beamMultisigAddress)

    await algebraFactory.write.startRenounceOwnership({
      account: beamMultisigAddress,
    })

    await algebraFactory.write.stopRenounceOwnership({
      account: beamMultisigAddress,
    })
  });

  it("Should deploy AlgebraVault and set it as communityVault for new created pools", async () => {
    const { voter, algebraFactory } = await loadFixture(deployFixture);

    // Let's deploy 2 tokens
    const token1 = await hre.viem.deployContract(
      "EmissionToken",
      ["Token1", "TKN1"],
    );

    const token2 = await hre.viem.deployContract(
      "EmissionToken",
      ["Token2", "TKN2"],
    );

    // Let's deploy a AlgebraVaultFactory
    const vaultFactory = await hre.viem.deployContract(
      "AlgebraVaultFactory",
      [voter.address, beamAlgebraFactory],
    );

    // Set the AlgebraVaultFactory as vault factory of the AlgebraFactory
    await algebraFactory.write.setVaultFactory([vaultFactory.address], {
      account: beamMultisigAddress,
    });

    // Create a pool with our 2 tokens
    await algebraFactory.write.createPool([
      token1.address,
      token2.address,
    ]);

    // Initialize the pool with a price, it will create the fee vault and set it as communityVault of the pool
    const poolAddr = await algebraFactory.read.poolByPair([
      token1.address,
      token2.address,
    ]);
    const pool = await hre.viem.getContractAt("IAlgebraPool", poolAddr);
    await pool.write.initialize([4295128739n]); // 4295128739 == MIN_SQRT_RATIO

    // Get the vault which should have been created now
    const algebraVaultAddr = await vaultFactory.read.getVaultForPool([poolAddr]);

    // Expect the communityVault of the pool to be our vault
    expect(algebraVaultAddr).to.not.equals(ZERO_ADDRESS);
    expect(await pool.read.communityVault()).to.equals(algebraVaultAddr);
  });

  it("Should transfer swap fees to our AlgebraVault instances", async () => {
    const { deployer, deployerAddress, algebraVaultFactory, algebraFactory, publicClient } = await loadFixture(deployFixture);

    const btc_btc = await hre.viem.getContractAt("ERC20", BTC_BTC);

    const wzeta = getContract({
      address: WZETA,
      abi: ABI_WZETA,
      client: {
        public: publicClient,
        wallet: deployer,
      }
    });
    const wzetaBalance = await wzeta.read.balanceOf([deployerAddress]);
    if (wzetaBalance > 0n) {
      await wzeta.write.withdraw([wzetaBalance]);
    }

    const amountIn = parseEther("100");
    await wzeta.write.deposit({value: amountIn});
    expect(await wzeta.read.balanceOf([deployerAddress])).to.equals(amountIn);

    const pool_WZETA_BTC_BTC = await hre.viem.getContractAt("IAlgebraPool",await algebraFactory.read.poolByPair([WZETA, BTC_BTC]));

    await algebraVaultFactory.write.createVaultForPool([pool_WZETA_BTC_BTC.address]);
    const vault = await algebraVaultFactory.read.poolToVault([pool_WZETA_BTC_BTC.address]);

    await pool_WZETA_BTC_BTC.write.setCommunityVault([vault], {
      account: beamMultisigAddress,
    });
    // struct GlobalState {
    //   uint160 price;
    //   int24 tick;
    //   uint16 lastFee;
    //   uint8 pluginConfig;
    //   uint16 communityFee;
    //   bool unlocked;
    // }
    const poolGlobalState = await pool_WZETA_BTC_BTC.read.globalState();
    const communityFee = poolGlobalState[4];

    if (communityFee != 1e3) {
      await pool_WZETA_BTC_BTC.write.setCommunityFee([1e3], {
        account: beamMultisigAddress,
      });
    }
    const communityFeeLastTimestamp = BigInt(await pool_WZETA_BTC_BTC.read.communityFeeLastTimestamp());

    const algebraSwapRouter = await hre.viem.getContractAt("ISwapRouter", algebraSwapRouterAddress);

    const timestamp = (await publicClient.getBlock()).timestamp;
    if (timestamp - communityFeeLastTimestamp < COMMUNITY_FEE_TRANSFER_FREQUENCY) {
      // Ensure the pool with transfer community fees to the vault:
      await time.setNextBlockTimestamp(communityFeeLastTimestamp + COMMUNITY_FEE_TRANSFER_FREQUENCY);
      await mine();
    }

    // Swap WZETA for BTC.BTC
    await wzeta.write.approve([algebraSwapRouter.address, amountIn]);
    await algebraSwapRouter.write.exactInputSingle([
      {
        tokenIn: WZETA,
        tokenOut: BTC_BTC,
        recipient: deployerAddress,
        amountIn: amountIn,
        amountOutMinimum: 0n,
        limitSqrtPrice: 0n,
        deadline: (await publicClient.getBlock()).timestamp + 1000n,
      }
    ]);

    const btcBalance = await btc_btc.read.balanceOf([deployerAddress]);
    expect(btcBalance > 0n).to.be.true;

    // The vault should have accumulated WZETA swap fees, but no BTC.BTC
    {
      const wzetaBalanceOfVault = await wzeta.read.balanceOf([vault]);
      expect(wzetaBalanceOfVault > 0n).to.be.true;
      const btcBalanceOfVault = await btc_btc.read.balanceOf([vault]);
      expect(btcBalanceOfVault).to.equals(0n);
    }

    // Swap BTC.BTC for WZETA:
    // Ensure the pool with transfer community fees to the vault:
    await time.setNextBlockTimestamp((await publicClient.getBlock()).timestamp + COMMUNITY_FEE_TRANSFER_FREQUENCY);
    await mine();

    await btc_btc.write.approve([algebraSwapRouter.address, btcBalance]);
    await algebraSwapRouter.write.exactInputSingle([
      {
        tokenIn: BTC_BTC,
        tokenOut: WZETA,
        recipient: deployerAddress,
        amountIn: btcBalance,
        amountOutMinimum: 0n,
        limitSqrtPrice: 0n,
        deadline: (await publicClient.getBlock()).timestamp + 1000n,
      }
    ]);

    expect(await btc_btc.read.balanceOf([deployerAddress])).to.equals(0n);

    // The vault should have accumulated both WZETA swap fees from first swap, and BTC.BTC from second swap
    {
      const wzetaBalanceOfVault = await wzeta.read.balanceOf([vault]);
      expect(wzetaBalanceOfVault > 0n).to.be.true;
      const btcBalanceOfVault = await btc_btc.read.balanceOf([vault]);
      expect(btcBalanceOfVault > 0n).to.be.true;
    }
  });

  it.only("Should distribute farming rewards as Algebra eternal farming incentives", async () => {
    const { deployer, deployerAddress, algebraVaultFactory, algebraFactory, publicClient, globalFactory, voter, veNFTId, activePeriod, minterProxy, incentiveMakerProxy, algebraEternalFarming, epochDistributorProxy, beamToken } = await loadFixture(deployFixture);

    const pool_WZETA_BTC_BTC = await hre.viem.getContractAt("IAlgebraPool",await algebraFactory.read.poolByPair([WZETA, BTC_BTC]));
    const pool_SOL_ETH = await hre.viem.getContractAt("IAlgebraPool",await algebraFactory.read.poolByPair([SOL_SOL, ETH_ETH]));

    // Whitelist tokens for gauge creation
    await globalFactory.write.addToken([[WZETA, BTC_BTC, SOL_SOL, ETH_ETH]]);

    for (const pool of [pool_WZETA_BTC_BTC, pool_SOL_ETH]) {
      await algebraVaultFactory.write.createVaultForPool([pool.address]);
      const vault = await algebraVaultFactory.read.poolToVault([pool.address]);

      await pool.write.setCommunityVault([vault], {
        account: beamMultisigAddress,
      });
      const poolGlobalState = await pool.read.globalState();
      const communityFee = poolGlobalState[4];

      if (communityFee != 1e3) {
        await pool.write.setCommunityFee([1e3], {
          account: beamMultisigAddress,
        });
      }

      // Create gauge for the pool
      await globalFactory.write.create([pool.address, POOL_TYPE_ALGEBRA]);
    }

    const votes = {
      [pool_WZETA_BTC_BTC.address]: 75n,
      [pool_SOL_ETH.address]: 25n,
    } as {[key: Address]: bigint};

    await voter.write.vote([veNFTId, Object.keys(votes) as [Address], Object.values(votes)]);

    let { nextPeriod } = await simulateOneWeek(activePeriod);
    await minterProxy.write.update_period();

    const expectedEmission = await minterProxy.read.weekly();

    await epochDistributorProxy.write.setAutomation([deployerAddress, true]);
    // TODO: cannot run twice: only once incentive can be enabled for each pool, need to disable first
    await epochDistributorProxy.write.distributeAll();

    const lefthoverAmount = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    const distributedAmount = await beamToken.read.balanceOf([algebraEternalFarming.address]);
    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    expect(distributedAmount > 0n).to.be.true;
  });
})
