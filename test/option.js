const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const vitalik = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // For impersonation

// NOTE: Deployer account must have enough paymentToken to pay for the option

describe("OptionTokenV2", function () {
  let oRetro;
  let retro;
  let paymentToken;
  let underlyingToken;
  let feeDistributor;

  before(async function () {
    const [deployer] = await ethers.getSigners();

    const VotingEscrow = await ethers.getContractFactory("VotingEscrow");
    const Retro = await ethers.getContractFactory("Retro");
    const UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
    const OptionTokenV2 = await ethers.getContractFactory("OptionTokenV2");
    const VeArtProxyUpgradeable = await ethers.getContractFactory(
      "VeArtProxyUpgradeable"
    );
    const OptionFeeDistributor = await ethers.getContractFactory(
      "OptionFeeDistributor"
    );

    const optionFeeDistributor = await OptionFeeDistributor.deploy();
    const retro = await Retro.deploy();
    const veArtProxyUpgradeable = await VeArtProxyUpgradeable.deploy();
    const votingEscrow = await VotingEscrow.deploy(
      retro.address,
      veArtProxyUpgradeable.address
    );
    const wmatic = await ethers.getContractAt(
      "contracts/interfaces/IWETH.sol:IWETH",
      "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270"
    );

    const name = "Option to buy RETRO";
    const symbol = "oRETRO";
    const admin = deployer.address;
    const paymentToken = wmatic.address; // WMATIC
    const underlyingToken = retro.address; // RETRO
    const gaugeFactory = "0x92ba53Fb2801cC1918916d62a6243eC47e278AFD";
    const feeDistributor = optionFeeDistributor.address;
    // The discount given when exercising. 30 = user pays 30%
    const discount = 30;
    // The discount given when exercising for veRETRO. 30 = user pays 30%
    const veDiscount = 100;

    // Using WMATIC/WETH pool TWAP temporarily for testing
    // TODO: change this to the RETRO/<paymentToken> pool
    const factory = "0x1F98431c8aD98523631AE4a59f267346ea31F984";
    const token0 = "0x0d500b1d8e8ef31e21c99d1db9a6444d3adf1270";
    const token1 = "0x7ceb23fd6bc0add59e62ac25578270cff1b9f619";
    const fee = 500;

    const uniswapV3Twap = await UniswapV3Twap.deploy(
      factory,
      token0,
      token1,
      fee
    );

    await uniswapV3Twap.deployed();

    const optionTokenV2 = await OptionTokenV2.deploy(
      name,
      symbol,
      admin,
      paymentToken,
      underlyingToken,
      uniswapV3Twap.address,
      gaugeFactory,
      feeDistributor,
      discount,
      veDiscount,
      votingEscrow.address
    );

    await optionTokenV2.deployed();

    this.feeDistributor = feeDistributor;
    this.oRetro = optionTokenV2;
    this.retro = retro;
    this.paymentToken = await ethers.getContractAt(
      "contracts/interfaces/IWETH.sol:IWETH",
      paymentToken
    );
    this.underlyingToken = await ethers.getContractAt(
      "contracts/interfaces/IERC20.sol:IERC20",
      underlyingToken
    );

    // Deposit some MATIC into wMATIC
    await this.paymentToken.deposit({ value: "1000000000000000000" });

    // Mint 1000 RETRO to deployer contract for testing
    await this.retro.mint(deployer.address, "1000000000000000000000");

    // Approve oRetro to take 100 RETRO for minting
    await this.retro.approve(this.oRetro.address, "100000000000000000000");

    // Mint 100 oRetro for testing
    await this.oRetro.mint(deployer.address, "100000000000000000000");

    // Approve oRetro to take the paymentToken for exercising
    await this.paymentToken.approve(
      this.oRetro.address,
      ethers.constants.MaxUint256
    );
  });

  describe("Exercising", function () {
    it("Should be able to exercise with discount", async function () {
      const [deployer] = await ethers.getSigners();

      const retroBalance0 = await this.retro.balanceOf(deployer.address);
      const oRetroBalance0 = await this.oRetro.balanceOf(deployer.address);
      const paymentTokenBalance0 = await this.paymentToken.balanceOf(
        deployer.address
      );

      const amount = ethers.BigNumber.from("1000000000000000000");
      const discount = 30;

      const twap = await this.oRetro.getTimeWeightedAveragePrice(amount);

      const discountedAmount = amount.mul(discount).div(100);
      const toPay = discountedAmount.mul(twap).div("1000000000000000000");

      await this.oRetro["exercise(uint256,uint256,address)"](
        amount,
        ethers.constants.MaxUint256,
        deployer.address
      );

      const retroBalance1 = await this.retro.balanceOf(deployer.address);
      const oRetroBalance1 = await this.oRetro.balanceOf(deployer.address);
      const paymentTokenBalance1 = await this.paymentToken.balanceOf(
        deployer.address
      );

      console.log("retroBalance0", retroBalance0.toString());
      console.log("retroBalance1", retroBalance1.toString());
      console.log("oRetroBalance0", oRetroBalance0.toString());
      console.log("oRetroBalance1", oRetroBalance1.toString());
      console.log("paymentTokenBalance0", paymentTokenBalance0.toString());
      console.log("paymentTokenBalance1", paymentTokenBalance1.toString());

      expect(retroBalance1.sub(retroBalance0)).to.equal(amount);

      expect(oRetroBalance0.sub(oRetroBalance1)).to.equal(amount);
      expect(paymentTokenBalance0.sub(paymentTokenBalance1)).to.equal(toPay);
    });
  });

  describe("Updating", function () {
    let impersonatedSigner;

    before(async function () {
      [deployer] = await ethers.getSigners();
    });

    beforeEach(async function () {
      await hre.network.provider.request({
        method: "hardhat_impersonateAccount",
        params: [vitalik],
      });

      impersonatedSigner = await ethers.getSigner(vitalik);
    });

    it("Only admin should be able to update feeDistributor", async function () {
      const newFeeDistributor = ethers.constants.AddressZero;
      const feeDistributorBefore = await this.oRetro.feeDistributor();

      expect(
        this.oRetro
          .connect(impersonatedSigner)
          .setFeeDistributor(newFeeDistributor)
      ).to.be.reverted;

      await this.oRetro.setFeeDistributor(newFeeDistributor);
      const feeDistributorAfter = await this.oRetro.feeDistributor();

      expect(feeDistributorBefore).equals(this.feeDistributor);
      expect(feeDistributorAfter).equals(newFeeDistributor);

      // Cleanup
      this.oRetro.setFeeDistributor(this.feeDistributor);
    });

    it("Only admin should be able to update discount", async function () {
      const newDiscount = 50;
      const discountBefore = await this.oRetro.discount();

      expect(this.oRetro.connect(impersonatedSigner).setDiscount(newDiscount))
        .to.be.reverted;

      await this.oRetro.setDiscount(newDiscount);
      const discountAfter = await this.oRetro.discount();

      expect(discountBefore).equals(30);
      expect(discountAfter).equals(newDiscount);

      // Cleanup
      this.oRetro.setDiscount(discountBefore);
    });

    it("Only admin should be able to update veDiscount", async function () {
      const newVeDiscount = 50;
      const veDiscountBefore = await this.oRetro.veDiscount();

      expect(
        this.oRetro.connect(impersonatedSigner).setVeDiscount(newVeDiscount)
      ).to.be.reverted;

      await this.oRetro.setVeDiscount(newVeDiscount);
      const veDiscountAfter = await this.oRetro.veDiscount();

      expect(veDiscountBefore).equals(100);
      expect(veDiscountAfter).equals(newVeDiscount);

      // Cleanup
      this.oRetro.setVeDiscount(veDiscountBefore);
    });

    it("Only admin should be able to update feeDistributor", async function () {
      const newFeeDistributor = ethers.constants.AddressZero;
      const feeDistributorBefore = await this.oRetro.feeDistributor();

      expect(
        this.oRetro
          .connect(impersonatedSigner)
          .setFeeDistributor(newFeeDistributor)
      ).to.be.reverted;

      await this.oRetro.setFeeDistributor(newFeeDistributor);
      const feeDistributorAfter = await this.oRetro.feeDistributor();

      expect(feeDistributorBefore).equals(this.feeDistributor);
      expect(feeDistributorAfter).equals(newFeeDistributor);

      // Cleanup
      this.oRetro.setFeeDistributor(this.feeDistributor);
    });

    it("Only admin should be able to setTwapSeconds", async function () {
      const newTwapSeconds = 100;
      const twapSecondsBefore = await this.oRetro.twapSeconds();

      expect(
        this.oRetro.connect(impersonatedSigner).setTwapSeconds(newTwapSeconds)
      ).to.be.reverted;

      await this.oRetro.setTwapSeconds(newTwapSeconds);
      const twapSecondsAfter = await this.oRetro.twapSeconds();

      expect(twapSecondsBefore).equals(60);
      expect(twapSecondsAfter).equals(newTwapSeconds);

      // Cleanup
      this.oRetro.setTwapSeconds(twapSecondsBefore);
    });
  });
});
