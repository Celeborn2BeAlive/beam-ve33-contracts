const { ethers } = require("hardhat");
const { getOptionContract } = require(".");

const amount = "5000000000000000000"

async function main() {
  const [signer] = await ethers.getSigners()

  const optionContract = await getOptionContract()

  const underlyingTokenAddress = await optionContract.underlyingToken()
  const underlyingToken = await ethers.getContractAt("ERC20", underlyingTokenAddress)

  const allowance = await underlyingToken.allowance(signer.address, optionContract.address)

  if (allowance.lt(amount)) {
    const tx = await underlyingToken.approve(optionContract.address, amount)
    await tx.wait()
  }

  await optionContract.mint(signer.address, amount)
}

main()
