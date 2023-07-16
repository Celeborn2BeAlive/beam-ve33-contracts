const { expect } = require("chai");
const { ethers } = require("hardhat");

// NOTE: Deployer account must have enough paymentToken to pay for the option

describe("OptionTokenV2", function () {
  let oRetro;
  let retro;
  let paymentToken;
  let underlyingToken;
  let treasury;

  before(async function () {
    const [deployer] = await ethers.getSigners();

    const VotingEscrow = await ethers.getContractFactory("VotingEscrow");
    const Retro = await ethers.getContractFactory("Retro");
    const UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
    const OptionTokenV2 = await ethers.getContractFactory("OptionTokenV2");

    const votingEscrow = await VotingEscrow.deploy();
    const retro = await Retro.deploy();
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
    // TODO: change this to the treasury address
    const treasury = "0x35dCEaD4670161a3D123b007922d61378D3A9d18";
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
      treasury,
      discount,
      veDiscount,
      votingEscrow.address
    );

    await optionTokenV2.deployed();

    this.treasury = treasury;
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

      const treasuryBalance0 = await this.paymentToken.balanceOf(this.treasury);
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

      const treasuryBalance1 = await this.paymentToken.balanceOf(this.treasury);
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

      expect(treasuryBalance1.sub(treasuryBalance0)).to.equal(toPay);

      expect(oRetroBalance0.sub(oRetroBalance1)).to.equal(amount);
      expect(paymentTokenBalance0.sub(paymentTokenBalance1)).to.equal(toPay);
      expect(treasuryBalance1.sub(treasuryBalance0)).to.equal(toPay);
    });

    it("Should be able to exercise with veDiscount", async function () {
      const [deployer] = await ethers.getSigners();
    });

    // it("Should send tokens to treasury", async function () {});
  });
});
