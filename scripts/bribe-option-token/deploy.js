const { ethers } = require("hardhat");

const params = {
  name: "Bribe veRETRO",
  symbol: "bveRETRO",
  optionToken: "0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F",
};

async function main() {
  await hre.network.provider.request({
    method: "hardhat_impersonateAccount",
    params: ["0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48"],
  });

  const signer = await ethers.getSigner(
    "0x69420cc9b83D641470D0FEa1cBf1A59D7a83Df48"
  );

  const BribeOptionToken = await ethers.getContractFactory(
    "BribeOptionToken",
    signer
  );
  const optionToken = await ethers.getContractAt(
    "OptionTokenV2",
    params.optionToken,
    signer
  );
  const votingEscrow = await ethers.getContractAt(
    "VotingEscrow",
    await optionToken.votingEscrow(),
    signer
  );

  const admin = signer.address;

  const bribeOptionToken = await BribeOptionToken.deploy(
    params.name,
    params.symbol,
    params.optionToken,
    admin
  );

  await bribeOptionToken.deployed();
  console.log("BribeOptionToken deployed to:", bribeOptionToken.address);

  const approvalTx = await optionToken.approve(
    bribeOptionToken.address,
    ethers.constants.MaxUint256
  );

  const optionBalance = await optionToken.balanceOf(signer.address);

  // Test to see if we can exercise the option
  const mintTx = await bribeOptionToken.mint(signer.address, 100000);
  const optionBalanceAfter = await optionToken.balanceOf(signer.address);

  //bribeOptionToken balance before exercise
  const balance = await bribeOptionToken.balanceOf(signer.address);
  const votingEscrowBalance = await votingEscrow.balanceOf(signer.address);

  const exerciseTx = await bribeOptionToken.exerciseVe(
    100000,
    signer.address,
    Math.floor(new Date().getTime() / 1000 + 1000000)
  );

  //bribeOptionToken balance after exercise
  const balanceAfter = await bribeOptionToken.balanceOf(signer.address);
  const votingEscrowBalanceAfter = await votingEscrow.balanceOf(signer.address);

  console.log("optionToken balance before mint: ", optionBalance.toString());
  console.log(
    "optionToken balance after mint: ",
    optionBalanceAfter.toString()
  );
  console.log("bribeOptionToken balance before exercise: ", balance.toString());
  console.log("difference: ", optionBalance.sub(optionBalanceAfter).toString());
  console.log(
    "votingEscrow balance before exercise: ",
    votingEscrowBalance.toString()
  );
  console.log(
    "bribeOptionToken balance after exercise: ",
    balanceAfter.toString()
  );
  console.log(
    "votingEscrow balance after exercise: ",
    votingEscrowBalanceAfter.toString()
  );

  const tokenOfOwnerByIndex = await votingEscrow.tokenOfOwnerByIndex(
    signer.address,
    votingEscrowBalanceAfter.sub(votingEscrowBalance)
  );

  const locked = await votingEscrow.locked(tokenOfOwnerByIndex);
  console.log("locked: ", locked);
}

main();
