const { ethers, network } = require("hardhat");
const data = require("./satin-ido-airdrop.json")

const veAirdropAddress = "0x0F3DF5d51754A0F390dB482cB45977EAC33a815B";

// Chunk size for airdrop
const chunkSize = 5;

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

  const chunks = await chunkArray(data, chunkSize)

  let airdropped = 0

  for (let i = 0; i < chunks.length; i++) {
    const addresses = []
    const amounts = []

    for (let j = 0; j < chunks[i].length; j++) {
      addresses.push(chunks[i][j].address)
      amounts.push(ethers.utils.parseUnits(chunks[i][j].amount.toString()))
      airdropped += chunks[i][j].amount
    }
    
    console.log("Airdropping...")
    await veAirdrop.airdrop(addresses, amounts, 5260000);
    console.log(`Airdropped  ${addresses.length * (i+1)} / ${data.length} addresses`)
  }
}

main()
