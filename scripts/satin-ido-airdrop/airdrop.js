const { ethers, network } = require("hardhat");
const data = require("./satin-ido-airdrop.json")

// Ratio of SATIN to RETRO
const ratio = 3662114334138721;
const ratioDecimals = 13;

const veAirdropAddress = "0x0F3DF5d51754A0F390dB482cB45977EAC33a815B";

// Chunk size for airdrop
const chunkSize = 10;

// Specify the chunk to start at
const startAtChunk = 4;

async function chunkArray(array, chunkSize) {
  const chunks = []
  for (let i = 0; i < array.length; i += chunkSize) {
    chunks.push(array.slice(i, i + chunkSize))
  }
  return chunks
}

async function main() {
  const addressToImpersonate = "0x38cc8e2bfe87ba71a0b4c893d5a94fbdcbd5e5ec"

  // impersonate the deployer
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [addressToImpersonate],
  });


  const signer = ethers.provider.getSigner(addressToImpersonate);

  const veAirdrop = await ethers.getContractAt("VeAirdrop", veAirdropAddress, signer);
  const underlyingToken = await ethers.getContractAt("ERC20", await veAirdrop.underlyingToken(), signer);

  // approve the airdrop contract to spend the underlying token
  await underlyingToken.approve(veAirdrop.address, ethers.constants.MaxUint256)

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
    
    console.log(`Airdropping (index: ${i})...`)
    // Airdrop the chunk
    await veAirdrop.airdrop(addresses, amounts, 5260000);
    console.log("Amount airdropped: ", ethers.utils.formatUnits(airdropped))
    console.log("Amount airdropped (non-ratio): ", ethers.utils.formatUnits(nonRatioAirdropped))
    console.log(`Airdropped  ${addresses.length * (i+1)} / ${data.length} addresses`)
  }
}

main()
