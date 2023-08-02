const { ethers, network } = require("hardhat");
const data = require("./filtered-addresses.json")
// const data = require("./fake-airdrop.json")

// Ratio of SATIN to RETRO
const ratio = "24414093119515252";
const ratioDecimals = 13;

// Chunk size for airdrop
const chunkSize = 15;

// Specify the chunk to start at
const startAtChunk = 23;

async function chunkArray(array, chunkSize) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

async function main() {


  const underlyingTokenAddr = "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb";

  //const addressToImpersonate = "0xc8949dbaf261365083a4b46ab683BaE1C9273203"

  //const signer = await ethers.getImpersonatedSigner(addressToImpersonate);

  const signer = ethers.provider.getSigner();

  console.log("Signer: ", await signer.getAddress())

  const veAirdrop = await ethers.getContractAt("VeAirdrop", "0x61abd1f2e06343690990e9ed45ced079973e31df", signer);

  // const underlyingToken = await ethers.getContractAt("Retro", underlyingTokenAddr, signer);

  // tx = await underlyingToken.transfer(veAirdrop.address, "1500000000000000000000000");
  // await tx.wait();
  // console.log('sent 1.5M retro to veAirdrop');

  // Split the addresses into chunks
  const chunks = await chunkArray(data, chunkSize)

  let airdropped = new ethers.BigNumber.from(0)
  let nonRatioAirdropped = new ethers.BigNumber.from(0)

  // Airdrop each chunk
  for (let i = startAtChunk; i < chunks.length; i++) {
    const addresses = []
    const amounts = []

    // Create the addresses and amounts arrays
    for (let j = 0; j < chunks[i].length; j++) {
      addresses.push(chunks[i][j].address)

      // Calculate the amount of RETRO to airdrop (gets locked for veRETRO)
      const satinAmount = ethers.utils.parseUnits(chunks[i][j].amount.toString())
      const retroAmount = satinAmount.div(ratio).mul(10 ** ratioDecimals)

      amounts.push(retroAmount)
      airdropped = airdropped.add(retroAmount)
      nonRatioAirdropped = nonRatioAirdropped.add(satinAmount)
    }

    console.log("Addresses: ", addresses)
    console.log("Amounts: ", amounts)
    
    console.log(`Airdropping (index: ${i})`)
    // Airdrop the chunk
    const tx = await veAirdrop.airdrop(addresses, amounts, 63072000, { gasLimit: 7500000 });
    const receipt = await tx.wait()
    const gasUsed = BigInt(receipt.cumulativeGasUsed) * BigInt(receipt.effectiveGasPrice);
    console.log("Gas used: ", ethers.utils.formatUnits(gasUsed.toString(), "gwei"))
    console.log("Amount airdropped: ", ethers.utils.formatUnits(airdropped))
    console.log("Amount airdropped (non-ratio): ", ethers.utils.formatUnits(nonRatioAirdropped))
    console.log(`Airdropped  ${addresses.length * (i+1)} / ${data.length} addresses`)
  }
}

main()
