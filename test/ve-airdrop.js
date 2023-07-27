const { expect } = require("chai");
const { ethers, network } = require("hardhat");

const votingEscrowAddress = "0x3B7B7Fb00c3E5726831E91E45441a013C65980D9";
const underlyingTokenAddress = "0x65Cd22173c15Ae29c0d133A1EB30Daa361953b95";
const lockDuration = 5256000;

describe("VE Airdrop", () => {
  let veAirdrop;
  let votingEscrow;
  let underlyingToken;

  before(async () => {
    votingEscrow = await ethers.getContractAt(
      "VotingEscrow",
      votingEscrowAddress,
    );
  })

  it("should be able to deploy", async () => {
    underlyingToken = await ethers.getContractAt(
      "ERC20",
      underlyingTokenAddress,
    );
    const VeAirdrop = await ethers.getContractFactory("VeAirdrop");
    veAirdrop = await VeAirdrop.deploy(
      votingEscrowAddress,
      underlyingTokenAddress,
      lockDuration
    );
    await veAirdrop.deployed();
    
    expect(await veAirdrop.votingEscrow()).to.equal(votingEscrowAddress);
    expect(await veAirdrop.underlyingToken()).to.equal(underlyingTokenAddress);
    expect(await veAirdrop.lockDuration()).to.equal(lockDuration);

    veAirdrop = veAirdrop;
    
  });
  
  it("should airdrop the correct amount of tokens", async () => {
    // impersonate the deployer
    await network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48"],
    });
    
    const signer = ethers.provider.getSigner("0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48");

    await underlyingToken.connect(signer).approve(veAirdrop.address, ethers.constants.MaxUint256)

    const recipients = [
      "0x83AA7C0074f128434d7c5Dc1AeC36266E36d484E",
      "0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48",
    ];
    const values = ["100000000000000000", "100000000000000000"];

    // expect every recipients balance to have increased by 1, and save the balance for each recipient
    const balancesBefore = [];
    for (let i = 0; i < recipients.length; i++) {
      balancesBefore.push(await votingEscrow.balanceOf(recipients[i]));
    }

    console.log("balancesBefore", balancesBefore);
    
    await veAirdrop.connect(signer).airdrop(recipients, values);

    const balancesAfter = [];
    for (let i = 0; i < recipients.length; i++) {
      balancesAfter.push(await votingEscrow.balanceOf(recipients[i]));
    }

    console.log("balancesAfter", balancesAfter);

    // expect every recipients balance to have increased by 1
    for (let i = 0; i < recipients.length; i++) {
      expect(balancesAfter[i]).to.equal(Number(balancesBefore[i]) + 1);
    }

    // get the tokenOfOwnerByIndex for every recipient
    const tokenIds = [];
    for (let i = 0; i < recipients.length; i++) {
      tokenIds.push(await votingEscrow.tokenOfOwnerByIndex(recipients[i], Number(balancesAfter[i]) - 1));
    }

    // expect every tokn id to have the correct value locked()
    for (let i = 0; i < recipients.length; i++) {
      expect((await votingEscrow.locked(tokenIds[i])).amount).to.equal(values[i]);
    }

    // expect every token id to have the correct value for ownerOf()
    for (let i = 0; i < recipients.length; i++) {
      expect(await votingEscrow.ownerOf(tokenIds[i])).to.equal(recipients[i]);
    }
  })
});