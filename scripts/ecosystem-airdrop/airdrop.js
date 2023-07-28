const { ethers, network } = require("hardhat");

async function chunkArray(array, chunkSize) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

async function main(airdrop, options) {


  const underlyingTokenAddr = "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb";

  const addressToImpersonate = "0xc8949dbaf261365083a4b46ab683BaE1C9273203"

 //  impersonate the deployer
   await network.provider.request({
     method: "hardhat_impersonateAccount",
     params: [addressToImpersonate],
   });

   const signer = ethers.provider.getSigner(addressToImpersonate);

  // const signer = ethers.provider.getSigner();

  console.log("Signer: ", await signer.getAddress())

  const veAirdrop = await ethers.getContractAt("VeAirdrop", "0x61abd1f2e06343690990e9ed45ced079973e31df", signer);

 const underlyingToken = await ethers.getContractAt("Retro", underlyingTokenAddr, signer);

  // approve the airdrop contract to spend the underlying token
  //const tx = await underlyingToken.approve(veAirdrop.address, ethers.constants.MaxUint256)
  //await tx.wait()

  tx = await underlyingToken.transfer(veAirdrop.address, "5000000000000000000000000");
  await tx.wait();

  //console.log('sent 5M retro to veAirdrop');

  // Split the addresses into chunks
  const chunks = await chunkArray(airdrop.addresses, options.chunkSize)

  let airdropped = new ethers.BigNumber.from(0)

  // Airdrop each chunk
  for (let i = options.startAtChunk; i < chunks.length; i++) {
    const addresses = []

    // Create the addresses and amounts arrays
    for (let j = 0; j < chunks[i].length; j++) {
      addresses.push(chunks[i][j])
      airdropped = airdropped.add(airdrop.amount)
    }

    const amounts = addresses.map(() => airdrop.amount)

    console.log("Addresses: ", addresses)
    console.log("Amounts: ", amounts)
    
    console.log(`Airdropping (index: ${i})`)
    // Airdrop the chunk
    const tx = await veAirdrop.airdrop(addresses, amounts, airdrop.lockTime, {
      gasLimit: 10000000,
    });
    const receipt = await tx.wait()
    const gasUsed = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);
    console.log("Gas used: ", ethers.utils.formatUnits(gasUsed.toString(), "gwei"))
    console.log("Amount airdropped: ", ethers.utils.formatUnits(airdropped))
    console.log(`Airdropped  ${addresses.length * (i+1)} / ${airdrop.addresses.length} addresses`)
  }
}

const airdrops = {
  thena: {
    amount: ethers.BigNumber.from("1000000000000000000"), 
    addresses: require("./addresses/thena.json"),
    lockTime: 63072000
  },
  ramses: {
    amount: ethers.BigNumber.from("1000000000000000000"),
    addresses: require("./addresses/ramses.json"),
    lockTime: 63072000
  },
  chronos: {
    amount: ethers.BigNumber.from("1000000000000000000"),
    addresses: require("./addresses/chronos.json"),
    lockTime: 63072000
  },
  velodrome: {
    amount: ethers.BigNumber.from("1000000000000000000"),
    addresses: require("./addresses/velodrome.json"),
    lockTime: 63072000
  }
}

const options = {
  chunkSize: 15,
  startAtChunk: 0,
}

main(airdrops.thena, options)
