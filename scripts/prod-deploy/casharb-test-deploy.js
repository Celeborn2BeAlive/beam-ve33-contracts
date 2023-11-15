//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers } = require('hardhat');
const { solidity } = require("ethereum-waffle");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

async function send(provider, method, params = []) {
    await provider.send(method, params)
}

async function mineBlock(provider) {
    await send(provider, "evm_mine")
}
  
async function increaseTime(provider, seconds) {
    await send(provider, "evm_increaseTime", [seconds])
}

async function main () {
  // Show current block
  const currentBlock = await time.latestBlock();
  console.log(`Running at a block ${currentBlock}`)


  // Show current price
  // USDC is token0
  // CASH is token1
  const pool = await ethers.getContractAt("@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol:IUniswapV3Pool","0x619259f699839dd1498ffc22297044462483bd27")
  const priceUSDCInCASH = (await pool.slot0()).sqrtPriceX96 ** 2 / 2**192
  const priceUSDCInCASHAdjustedForDecimals = priceUSDCInCASH / 10**12
  const priceCASHInUSD = 1 / priceUSDCInCASHAdjustedForDecimals
  console.log(`Price: 1 CASH is ${priceCASHInUSD} USDC`)

  // Show USDC USDT price
  // USDC is token0
  // USDT is token1
  // const poolUSDCUSDT = await ethers.getContractAt("@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol:IUniswapV3Pool","0x772510189425ac63f9a5A5eF2fd0C7FDA58CBFC7")
  // const priceUSDCInUSDT = (await poolUSDCUSDT.slot0()).sqrtPriceX96 ** 2 / 2**192
  // console.log(`Price: 1 USDC is ${priceUSDCInUSDT} USDT`)
  // const priceUSDTInUSDC = 1 / priceUSDCInUSDT
  // console.log(`Price: 1 USDT is ${priceUSDTInUSDC} USDC`)


  // Do
  const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
  const impersonateTeam = await ethers.getImpersonatedSigner("0x35dCEaD4670161a3D123b007922d61378D3A9d18");
  const timelock = await ethers.getContractAt("StablTimelock","0x99ecCeB96171F30838389684871A467B21613860",impersonateTeam)
  
  const CashArb = await ethers.getContractFactory("Arb", impersonateMyself)
  let cashArb = await CashArb.deploy(
    "0x3Fa147D6309abeb5C1316f7d8a7d8bD023e0cd80", // loanPool
    "0x2791bca1f2de4661ed88a30c99a7a9449aa84174", // USDC
    "0x5d066d022ede10efa2717ed3d79f22f949f8c175", // CASH
    "0x8f3cf7ad23cd3cadbd9735aff958023239c6a063", // DAI
    "0xc2132d05d31c914a87c6611c10748aeb04b58e8f", // USDT
    "0x1891783cb3497Fdad1F25C933225243c2c7c4102", // Retro router
    "0xe592427a0aece92de3edee1f18e0157c05861564", // Uniswap router
    "0xA0BCD74a2021F82BB1Ba42E7Da867Be28D37C831", // Dripper
    "0x0000000000000000000000000000000000000000", // A
    "0x0000000000000000000000000000000000000000"  // B
  )
  // await cashArb.waitForDeployment() // Use this for hardhat-tools >= 3.0.0 https://ethereum.stackexchange.com/questions/151236/fixed-hardhat-deploy-error
  // let cashArbAddress = await cashArb.getAddress() // Use this for hardhat-tools >= 3.0.0
  await cashArb.deployed()
  let cashArbAddress = cashArb.address

  await impersonateMyself.sendTransaction({
      to: impersonateTeam.address,
      value: ethers.utils.parseEther("30"),
      });

    tx = await timelock.signalSetFeeExempt(cashArbAddress, true)
    await tx.wait()

    await time.increase(86400)

    tx = await timelock.setFeeExempt(cashArbAddress, true)
    await tx.wait()

    console.log("Doing work")

    let movePriceUp = priceCASHInUSD < 1


    for (toSwap of [
      1000000000, // 1k,
      10000000000, // 10k
      100000000000, // 100k
      // 1000000000000, // 1m
    ]) {
      console.log(`Testing arb with ${Number(toSwap)/10**6} USDC (${toSwap}). Moving price ${movePriceUp? 'up': 'down'}`)
      let profit = await cashArb.callStatic.work(toSwap, movePriceUp); //1k
      console.log(`Profit is ${profit}, with decimals: ${Number(profit)/10**6} USDC`)
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
