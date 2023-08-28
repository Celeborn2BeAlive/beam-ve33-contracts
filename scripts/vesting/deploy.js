//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require("hardhat");
const { solidity } = require("ethereum-waffle");
const ether = require("@openzeppelin/test-helpers/src/ether");

async function send(provider, method, params = []) {
  await provider.send(method, params);
}

async function mineBlock(provider) {
  await send(provider, "evm_mine");
}

async function increaseTime(provider, seconds) {
  await send(provider, "evm_increaseTime", [seconds]);
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

const vestings = {
  "0x9d2E54E01C36C3758a2b2058E343Dc35cEC67135": "2000000000000000000000000",
  "0x1b8c43b49cf37d10484d6af505a6e6d5e4897c25": "600000000000000000000000",
  "0x026F9a7B3664a16c01c29F86092a6348adbf6638": "600000000000000000000000",
  "0x5afa076bbc358ffb75a24b8ec256378f9396d054": "240000000000000000000000",
  "0x66Aeff517e9e00210c9298E10094F438401D221a": "300000000000000000000000",
  "0xB11eacc17bd735854D9d89BEE9EFE1D6b7e0B9Bf": "20000000000000000000000",
  "0xcf727c41aCf721Da6efb0d79601ed533E54D94f9": "20000000000000000000000",
  "0x39069AdD37ea21D3db98E01e8Ad81baCEF739168": "90000000000000000000000",
  "0x5cA9bEfB1b2638e5d6fF78cDB16b11340C144915": "80000000000000000000000",
  "0x60B8487cEbA158FbB9D5C87c9768971d6e1965a8": "40000000000000000000000",
  "0xbf297Ce6E28958971DF557b9c69e1297D414ABA5": "10000000000000000000000",
};

//chain
async function main() {

  const vestingV1Address = "0x5FFF368af188664a214a15CA742e8E58279f1867"
  const signer = ethers.provider.getSigner();
  const vestingV1 = await ethers.getContractAt("SimpleTeamVesting", vestingV1Address, signer);

  var accounts = Object.keys(vestings);
  var values = Object.values(vestings);

  data = await ethers.getContractFactory("SimpleTeamVesting", signer);
  vesting = await data.deploy();
  await sleep(2500);

  tx = await vesting._init(accounts, values);
  await tx.wait();
  await sleep(2500);

  const underlyingToken = await ethers.getContractAt("Retro", "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb", signer);

  const balance = await underlyingToken.balanceOf(vestingV1.address)
  tx = await vestingV1.withdrawAll(underlyingToken.address)
  await tx.wait();

  tx = await underlyingToken.transfer(vesting.address, balance);
  await tx.wait();
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
