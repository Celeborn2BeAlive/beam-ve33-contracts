import hre, { ignition } from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress, ZERO_ADDRESS } from "../../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount, loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { isLocalhostNetwork, isZetachainForkNetwork } from "../constants";
import { getAddress, parseEther, getContract, Address, formatUnits } from "viem";
import { ABI_WZETA } from "../abi/WZETA";
import { ABI_AlgebraFactory } from "../abi/AlgebraFactory";
import BeamProtocol from "../../ignition/modules/BeamProtocol";
import { create10PercentOfTotalSupplyLock, simulateOneWeekAndFlipEpoch } from "../utils";
import { ABI_AlgebraSwapRouter } from "../abi/AlgebraSwapRouter";
import { ABI_AlgebraEternalFarming } from "../abi/AlgebraEternalFarming";
import { ABI_AlgebraNonFungiblePositionManager } from "../abi/AlgebraNonFungiblePositionManager";
import { ABI_AlgebraFarmingCenter } from "../abi/AlgebraFarmingCenter";

const deploymentId = "chain-31337-zetachain-fork";

const algebraSwapRouterAddress = getAddress("0x84A5509Dce0b68C73B89e67454C30912293c7ea0");

const WZETA = getAddress("0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf");
const BTC_BTC = getAddress("0x13a0c5930c028511dc02665e7285134b6d11a5f4");

const COMMUNITY_FEE_TRANSFER_FREQUENCY = 8n * 24n * 3600n; // 8 hours

describe("AlgebraFactory", function() {
  before(async function () {
    if (!isZetachainForkNetwork) {
      this.skip();
    }
    await impersonateAccount(beamMultisigAddress); // For admin on AlgebraFactory
    await mine(); // Workaround for error "No known hardfork for execution on historical block ..." when forking
  });

  const deployFixture = async () => {
    const [deployer, user] = await hre.viem.getWalletClients();
    const deployerAddress = getAddress(deployer.account.address);
    const publicClient = await hre.viem.getPublicClient();

    const beam = await ignition.deploy(BeamProtocol, {
      deploymentId
    });

    const algebraFactory = getContract({
      address: beamAlgebraFactory,
      abi: ABI_AlgebraFactory,
      client: {
        public: publicClient,
        wallet: deployer,
      }
    });

    const { algebraVaultFactory } = beam;

    // Initialize Beam protocol and link it to Algebra Farming:

    // Set the AlgebraVaultFactory as vault factory of the AlgebraFactory
    // Note: The AlgebraFactory already has a default vaultFactory so we need to check if our own is set
    if (algebraVaultFactory.address != await algebraFactory.read.vaultFactory()) {
      await algebraFactory.write.setVaultFactory([algebraVaultFactory.address], {
        account: await algebraFactory.read.owner(),
      });
    }

    return {
      deployer,
      deployerAddress,
      user,
      publicClient,
      ...beam,
      algebraFactory,
    }
  };

  it("Should deploy AlgebraVault and set it as communityVault for newly created pools", async () => {
    const { algebraVaultFactory, algebraFactory } = await loadFixture(deployFixture);

    // Let's deploy 2 tokens
    const token1 = await hre.viem.deployContract(
      "ERC20PresetMinterPauser",
      ["Token1", "TKN1"],
    );

    const token2 = await hre.viem.deployContract(
      "ERC20PresetMinterPauser",
      ["Token2", "TKN2"],
    );

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
    const algebraVaultAddr = await algebraVaultFactory.read.getVaultForPool([poolAddr]);

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

    if (ZERO_ADDRESS == await algebraVaultFactory.read.poolToVault([pool_WZETA_BTC_BTC.address])) {
      await algebraVaultFactory.write.createVaultForPool([pool_WZETA_BTC_BTC.address]);
    }
    const vault = await algebraVaultFactory.read.poolToVault([pool_WZETA_BTC_BTC.address]);
    if (vault != await pool_WZETA_BTC_BTC.read.communityVault()) {
      await pool_WZETA_BTC_BTC.write.setCommunityVault([vault], {
        account: await algebraFactory.read.owner(),
      });
    }
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
        account: await algebraFactory.read.owner(),
      });
    }
    const communityFeeLastTimestamp = BigInt(await pool_WZETA_BTC_BTC.read.communityFeeLastTimestamp());

    const algebraSwapRouter = getContract({
      abi: ABI_AlgebraSwapRouter,
      address: algebraSwapRouterAddress,
      client: {
        public: publicClient,
        wallet: deployer,
      }
    });

    const btcBalanceBeforeSwap = await btc_btc.read.balanceOf([deployerAddress]);

    const wzetaBalanceOfVaultBeforeSwap = await wzeta.read.balanceOf([vault]);
    const btcBalanceOfVaultBeforeSwap = await btc_btc.read.balanceOf([vault]);

    const timestamp = (await publicClient.getBlock()).timestamp;
    if (timestamp - communityFeeLastTimestamp < COMMUNITY_FEE_TRANSFER_FREQUENCY) {
      // Ensure the pool with transfer community fees to the vault:
      await time.setNextBlockTimestamp(communityFeeLastTimestamp + COMMUNITY_FEE_TRANSFER_FREQUENCY);
      await mine();
    }

    const communityFeesPending = await pool_WZETA_BTC_BTC.read.getCommunityFeePending();
    const token0 = await pool_WZETA_BTC_BTC.read.token0();
    const token1 = await pool_WZETA_BTC_BTC.read.token1();
    const feesPending = {
      [token0]: communityFeesPending[0],
      [token1]: communityFeesPending[1],
    };
    expect(wzeta.address in feesPending).to.be.true;
    expect(btc_btc.address in feesPending).to.be.true;

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
    expect(btcBalance > btcBalanceBeforeSwap).to.be.true;

    // The vault should have accumulated WZETA swap fees, but no BTC.BTC
    {
      const wzetaBalanceOfVault = await wzeta.read.balanceOf([vault]);
      expect(wzetaBalanceOfVault > (wzetaBalanceOfVaultBeforeSwap + feesPending[wzeta.address])).to.be.true;
      const btcBalanceOfVault = await btc_btc.read.balanceOf([vault]);
      expect(btcBalanceOfVault).to.equals(btcBalanceOfVaultBeforeSwap + feesPending[btc_btc.address]);
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
      const btcBalanceOfVault = await btc_btc.read.balanceOf([vault]);
      expect(btcBalanceOfVault > btcBalanceOfVaultBeforeSwap + feesPending[btc_btc.address]).to.be.true;
    }
  });
})
