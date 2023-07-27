const { BigNumber, ethers } = require("ethers")
const data = require("./filtered-addresses.json")

async function main() {
 
  let sum = BigNumber.from(0)

  for (let i = 0; i < data.length; i++) {
    const amount = ethers.utils.parseUnits(data[i].amount.toString())
    sum = sum.add(amount)
  }

  console.log(ethers.utils.formatUnits(sum.toString()))
}

main()