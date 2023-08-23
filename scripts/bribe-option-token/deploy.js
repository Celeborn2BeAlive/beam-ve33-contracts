const { ethers } = require("hardhat");

const params = {
  name: "Bribe veRETRO",
  symbol: "bveRETRO",
  optionToken: "0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F",
};

async function main() {
  const [deployer] = await ethers.getSigners();
  const BribeOptionToken = await ethers.getContractFactory("BribeOptionToken");

  // Deploying the contract, default admin is the deployer
  const bribeOptionToken = await BribeOptionToken.deploy(
    params.name,
    params.symbol,
    params.optionToken,
    deployer.address
  );

  await bribeOptionToken.deployed();

  console.log("BribeOptionToken deployed to:", bribeOptionToken.address);

  // SOME RANDOM CHECKS
  // await hre.network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: ["0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48"],
  // });
  // await hre.network.provider.request({
  //   method: "hardhat_impersonateAccount",
  //   params: ["0xa966e4e25d3bae14a9a34e63ee4e5a0d179ab39f"],
  // });
  // const me = await ethers.getSigner(
  //   "0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48"
  // );
  // const admin = await ethers.getSigner(
  //   "0xa966e4e25d3bae14a9a34e63ee4e5a0d179ab39f"
  // );
  // const BribeOptionToken = await ethers.getContractFactory("BribeOptionToken");
  // const optionToken = await ethers.getContractAt(
  //   "OptionTokenV2",
  //   params.optionToken
  // );
  // const votingEscrow = await ethers.getContractAt(
  //   "VotingEscrow",
  //   await optionToken.votingEscrow()
  // );
  // const bribeOptionToken = await BribeOptionToken.deploy(
  //   params.name,
  //   params.symbol,
  //   params.optionToken,
  //   admin.address
  // );
  // await bribeOptionToken.deployed();
  // console.log("BribeOptionToken deployed to:", bribeOptionToken.address);
  // const approvalTx = await optionToken
  //   .connect(admin)
  //   .approve(bribeOptionToken.address, ethers.constants.MaxUint256);
  // const optionBalance = await optionToken.balanceOf(admin.address);
  // console.log("optionToken balance before mint: ", optionBalance.toString());
  // // Test to see if we can exercise the option
  // const mintTx = await bribeOptionToken.connect(admin).mint(me.address, 100000);
  // const optionBalanceAfter = await optionToken.balanceOf(admin.address);
  // console.log("minted");
  // //bribeOptionToken balance before exercise
  // const balance = await bribeOptionToken.balanceOf(me.address);
  // const votingEscrowBalance = await votingEscrow.balanceOf(me.address);
  // const exerciseTx = await bribeOptionToken
  //   .connect(me)
  //   .exerciseVe(
  //     100000,
  //     me.address,
  //     Math.floor(new Date().getTime() / 1000 + 1000000)
  //   );
  // //bribeOptionToken balance after exercise
  // const balanceAfter = await bribeOptionToken.balanceOf(me.address);
  // const votingEscrowBalanceAfter = await votingEscrow.balanceOf(me.address);
  // console.log("optionToken balance before mint: ", optionBalance.toString());
  // console.log(
  //   "optionToken balance after mint: ",
  //   optionBalanceAfter.toString()
  // );
  // console.log("bribeOptionToken balance before exercise: ", balance.toString());
  // console.log("difference: ", optionBalance.sub(optionBalanceAfter).toString());
  // console.log(
  //   "votingEscrow balance before exercise: ",
  //   votingEscrowBalance.toString()
  // );
  // console.log(
  //   "bribeOptionToken balance after exercise: ",
  //   balanceAfter.toString()
  // );
  // console.log(
  //   "votingEscrow balance after exercise: ",
  //   votingEscrowBalanceAfter.toString()
  // );
  // const tokenOfOwnerByIndex = await votingEscrow.tokenOfOwnerByIndex(
  //   me.address,
  //   votingEscrowBalanceAfter.sub(1)
  // );
  // const locked = await votingEscrow.locked(tokenOfOwnerByIndex);
  // console.log("locked: ", locked);
}

main();
