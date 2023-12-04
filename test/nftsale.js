const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const vitalik = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045"; // For impersonation

// NOTE: Deployer account must have enough paymentToken to pay for the option

describe("OptionTokenV2", function () {

  var optionFeeDistributor
  var veArtProxyUpgradeable

  before(async function () {
    const [deployer] = await ethers.getSigners();

    const nftsale = await ethers.getContractFactory("zkZERO");
    const batchsale = await ethers.getContractFactory("zkZeroBatch");

    optionFeeDistributor = await nftsale.deploy("0x141d48801abC47213D7f714b77618E698ADCbe44");
    veArtProxyUpgradeable = await batchsale.deploy("0x141d48801abC47213D7f714b77618E698ADCbe44");

  });

  describe("Exercising", function () {
    it("Should be able to exercise with discount", async function () {
      const [deployer] = await ethers.getSigners();


    });
  });
});
