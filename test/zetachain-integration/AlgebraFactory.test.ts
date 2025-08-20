import hre, { ignition } from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress, ZERO_ADDRESS } from "../../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount, loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { isLocalhostNetwork, POOL_TYPE_ALGEBRA } from "../constants";
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
const algebraFarmingCenterAddress = getAddress("0xA299fc85bC034C895694A9a2E44ed01C251a64b9");
const algebraEternalFarmingAddress = getAddress("0xe310Ce3A6382E522e4d988735b2De13b35E30149");
const algebraNonFungiblePositionManagerAddress = getAddress("0xD2F0d8cd7A1d7276D8Ac13AC761F83310dA9c1e2");

const holderOfCLNFTs = getAddress("0x84667f1aecf4C6c2c1d2Bd180572Bc5fdffBe836");
const clNFT_ZETA_BTC_tokenId = 4n;

const WZETA = getAddress("0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf");
const SOL_SOL = getAddress("0x4bc32034caccc9b7e02536945edbc286bacba073");
const ETH_ETH = getAddress("0xd97b1de3619ed2c6beb3860147e30ca8a7dc9891");
const BTC_BTC = getAddress("0x13a0c5930c028511dc02665e7285134b6d11a5f4");

const COMMUNITY_FEE_TRANSFER_FREQUENCY = 8n * 24n * 3600n; // 8 hours

const INITIAL_BEAM_TOKEN_SUPPLY = parseEther("50000000");
const INCENTIVE_ID_ZERO = "0x0000000000000000000000000000000000000000000000000000000000000000";

describe("AlgebraFactory", function() {
  before(async function () {
    if (!isLocalhostNetwork) {
      this.skip();
    }
    await impersonateAccount(beamMultisigAddress); // For admin on AlgebraFactory
    await impersonateAccount(holderOfCLNFTs); // For staking of CL NFTs in farming center
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
    const algebraEternalFarming = getContract({
      abi: ABI_AlgebraEternalFarming,
      address: algebraEternalFarmingAddress,
      client: { public: publicClient, wallet: deployer }
    });

    const { beamToken, minterProxy, epochDistributorProxy, voter, claimer, votingEscrow } = beam;
    const { globalFactory, incentiveMakerProxy, algebraVaultFactory } = beam;

    // Initialize Beam protocol and link it to Algebra Farming:

    // Set the AlgebraVaultFactory as vault factory of the AlgebraFactory
    // Note: The AlgebraFactory already has a default vaultFactory so we need to check if our own is set
    if (algebraVaultFactory.address != await algebraFactory.read.vaultFactory()) {
      await algebraFactory.write.setVaultFactory([algebraVaultFactory.address], {
        account: await algebraFactory.read.owner(),
      });
    }

    // Assign INCENTIVE_MAKER_ROLE to our IncentiveMaker contract instance,
    // which is required for it to be able to create Algebra Eternal Farming campaigns
    const incentiveMakerRole = await algebraEternalFarming.read.INCENTIVE_MAKER_ROLE();
    const hasIncentiveMakerRole = await algebraFactory.read.hasRole([incentiveMakerRole, incentiveMakerProxy.address]);
    if (!hasIncentiveMakerRole) {
      await algebraFactory.write.grantRole([incentiveMakerRole, incentiveMakerProxy.address], {
        account: beamMultisigAddress
      });
    }

    // Initialize the IncentiveMaker so it's connected to Algebra farming
    if (ZERO_ADDRESS == await incentiveMakerProxy.read.algebraEternalFarming()) {
      await incentiveMakerProxy.write._initialize([algebraEternalFarming.address, voter.address]);
    }

    if (minterProxy.address != await beamToken.read.minter()) {
      // Mint initial tokens and set minter
      await beamToken.write.mint([deployerAddress, INITIAL_BEAM_TOKEN_SUPPLY]);
      await beamToken.write.setMinter([minterProxy.address]);

      // Set minter config and initialize it
      await minterProxy.write.setRebase([0n]);
      await minterProxy.write.setTeamRate([0n]);
      await minterProxy.write._initialize();

      await create10PercentOfTotalSupplyLock(beamToken, votingEscrow);
    }
    const activePeriod = await minterProxy.read.active_period();
    const veNFTId = await votingEscrow.read.tokenOfOwnerByIndex([deployerAddress, 0n]);

    return {
      deployer,
      deployerAddress,
      user,
      publicClient,
      ...beam,
      algebraFactory,
      algebraEternalFarming,
      activePeriod,
      veNFTId,
    }
  };

  it("Should have Beam multisig as owner()", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    expect(await algebraFactory.read.owner()).to.equal(beamMultisigAddress)
  });

  it("Should allow impersonate as owner()", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    await algebraFactory.write.startRenounceOwnership({
      account: await algebraFactory.read.owner(),
    })

    await algebraFactory.write.stopRenounceOwnership({
      account: await algebraFactory.read.owner(),
    })
  });

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
      expect(wzetaBalanceOfVault > wzetaBalanceOfVaultBeforeSwap).to.be.true;
      const btcBalanceOfVault = await btc_btc.read.balanceOf([vault]);
      expect(btcBalanceOfVault).to.equals(btcBalanceOfVaultBeforeSwap);
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
      expect(btcBalanceOfVault > btcBalanceOfVaultBeforeSwap).to.be.true;
    }
  });

  it("Should distribute farming rewards as Algebra eternal farming incentives", async () => {
    const { deployer, deployerAddress, algebraVaultFactory, algebraFactory, publicClient, globalFactory, voter, veNFTId, activePeriod, minterProxy, incentiveMakerProxy, algebraEternalFarming, epochDistributorProxy, beamToken } = await loadFixture(deployFixture);

    const pool_WZETA_BTC_BTC = await hre.viem.getContractAt("IAlgebraPool",await algebraFactory.read.poolByPair([WZETA, BTC_BTC]));
    const pool_SOL_ETH = await hre.viem.getContractAt("IAlgebraPool",await algebraFactory.read.poolByPair([SOL_SOL, ETH_ETH]));

    // Whitelist tokens for gauge creation
    await globalFactory.write.addToken([[WZETA, BTC_BTC, SOL_SOL, ETH_ETH]]);

    for (const pool of [pool_WZETA_BTC_BTC, pool_SOL_ETH]) {
      if (ZERO_ADDRESS == await algebraVaultFactory.read.poolToVault([pool.address])) {
        await algebraVaultFactory.write.createVaultForPool([pool.address]);
      }

      const vault = await algebraVaultFactory.read.poolToVault([pool.address]);
      if (vault != await pool.read.communityVault()) {
        await pool.write.setCommunityVault([vault], {
          account: await algebraFactory.read.owner(),
        });
      }

      const poolGlobalState = await pool.read.globalState();
      const communityFee = poolGlobalState[4];
      if (communityFee != 1e3) {
        await pool.write.setCommunityFee([1e3], {
          account: await algebraFactory.read.owner(),
        });
      }
      const isVotable = await voter.read.isPool([pool.address]);
      if (!isVotable) {
        // Create gauge for the pool and add it to voter
        await globalFactory.write.create([pool.address, POOL_TYPE_ALGEBRA]);
      }
    }

    const votes = {
      [pool_WZETA_BTC_BTC.address]: 75n,
      [pool_SOL_ETH.address]: 25n,
    } as {[key: Address]: bigint};

    await voter.write.vote([veNFTId, Object.keys(votes) as [Address], Object.values(votes)]);

    const balanceOfDistributorBeforeEpochFlip = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    if (balanceOfDistributorBeforeEpochFlip > 0n) {
      await epochDistributorProxy.write.emergencyRecoverERC20([beamToken.address, balanceOfDistributorBeforeEpochFlip]);
      expect(await beamToken.read.balanceOf([epochDistributorProxy.address])).to.equals(0n);
    }

    await simulateOneWeekAndFlipEpoch(minterProxy);

    const expectedEmission = await minterProxy.read.weekly();

    const algebraEternalFarmingRewardAmountBeforeDistribute = await beamToken.read.balanceOf([algebraEternalFarming.address]);

    await epochDistributorProxy.write.setAutomation([deployerAddress, true]);
    await epochDistributorProxy.write.distributeAll();

    const lefthoverAmount = await beamToken.read.balanceOf([epochDistributorProxy.address]);
    const algebraEternalFarmingRewardAmountAfterDistribute = await beamToken.read.balanceOf([algebraEternalFarming.address]);
    const distributedAmount = algebraEternalFarmingRewardAmountAfterDistribute - algebraEternalFarmingRewardAmountBeforeDistribute;
    expect(distributedAmount > 0n).to.be.true;
    expect(expectedEmission).to.equals(distributedAmount + lefthoverAmount);
    expect(lefthoverAmount < distributedAmount * 10n / 1000n).to.be.true; // Arbitrary check: less than 0.1% lefthover

    // Simulate farming, impersonating an address holding a CL NFT of ZETA/BTC pool:

    const algebraNonFungiblePositionManager = getContract({
      abi: ABI_AlgebraNonFungiblePositionManager,
      address: algebraNonFungiblePositionManagerAddress,
      client: { public: publicClient, wallet: deployer }
    });

    expect(await algebraNonFungiblePositionManager.read.ownerOf([clNFT_ZETA_BTC_tokenId])).to.equals(holderOfCLNFTs);

    const algebraFarmingCenter = getContract({
      abi: ABI_AlgebraFarmingCenter,
      address: algebraFarmingCenterAddress,
      client: { public: publicClient, wallet: deployer }
    });

    // struct IncentiveKey {
    //   IERC20Minimal rewardToken;
    //   IERC20Minimal bonusRewardToken;
    //   IAlgebraPool pool;
    //   uint256 nonce;
    // }
    const [rewardToken, bonusRewardToken, pool, nonce] = await incentiveMakerProxy.read.poolToKey([pool_WZETA_BTC_BTC.address]);
    expect(rewardToken).to.equals(beamToken.address);
    expect(bonusRewardToken).to.equals(WZETA);
    expect(pool).to.equals(pool_WZETA_BTC_BTC.address);
    const incentiveKey = {
      rewardToken,
      bonusRewardToken,
      pool,
      nonce,
    };

    const beamBalanceBeforeFarming = await beamToken.read.balanceOf([holderOfCLNFTs]);

    await algebraNonFungiblePositionManager.write.approveForFarming([clNFT_ZETA_BTC_tokenId, true, algebraFarmingCenter.address], { account: holderOfCLNFTs });

    if (INCENTIVE_ID_ZERO != await algebraFarmingCenter.read.deposits([clNFT_ZETA_BTC_tokenId])) {
      await algebraFarmingCenter.write.exitFarming([incentiveKey, clNFT_ZETA_BTC_tokenId], { account: holderOfCLNFTs });
    }
    await algebraFarmingCenter.write.enterFarming([incentiveKey, clNFT_ZETA_BTC_tokenId], { account: holderOfCLNFTs });

    const timestamp = (await publicClient.getBlock()).timestamp;
    await time.setNextBlockTimestamp(timestamp + 60n); // Farming for 60 sec
    await mine();

    const [rewardAmount, bonusRewardAmount] = await algebraEternalFarming.read.getRewardInfo([incentiveKey, clNFT_ZETA_BTC_tokenId]);
    expect(rewardAmount > 0n).to.be.true;
    expect(bonusRewardAmount).to.equals(0n);
    console.log(`Position ${clNFT_ZETA_BTC_tokenId} of ${holderOfCLNFTs} has farmed ${formatUnits(rewardAmount, 18)} BEAM`);

    // On the frontend, the two following calls should be sent as a multicall:
    await algebraFarmingCenter.write.collectRewards([incentiveKey, clNFT_ZETA_BTC_tokenId], { account: holderOfCLNFTs}); // This call collect rewards for the owner of the NFT, but rewards are kept in the Algebra contracts
    await algebraFarmingCenter.write.claimReward([rewardToken, holderOfCLNFTs, rewardAmount], { account: holderOfCLNFTs}); // This call extract the rewards and send them to the address provided as second argument

    const beamBalanceAfterFarming = await beamToken.read.balanceOf([holderOfCLNFTs]);
    expect(beamBalanceAfterFarming - beamBalanceBeforeFarming).to.equals(rewardAmount);

    await algebraFarmingCenter.write.exitFarming([incentiveKey, clNFT_ZETA_BTC_tokenId], { account: holderOfCLNFTs });
  });
})
