const fs = require("fs")
const addresses = require("./addresses.json")
const blacklist = require("./blacklist.json")

async function main() {
  
  const numAddresses = addresses.length
  console.log(`Number of addresses: ${numAddresses}`)

  const filteredAddresses = addresses.filter(address => !blacklist.includes(address.address))

  const numFilteredAddresses = filteredAddresses.length
  console.log(`Number of filtered addresses: ${numFilteredAddresses}`)

  const blacklistLength = blacklist.length
  console.log(`Number of blacklisted addresses: ${blacklistLength}`)

  // save json file
  fs.writeFileSync("./filtered-addresses.json", JSON.stringify(filteredAddresses))
}

main()