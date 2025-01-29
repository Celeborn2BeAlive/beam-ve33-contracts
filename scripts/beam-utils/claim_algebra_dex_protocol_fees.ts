import hre from "hardhat";
import { getContract, getAddress, Address, encodeFunctionData } from 'viem'

async function main () {
  const [ walletClient ] = await hre.viem.getWalletClients();
  const publicClient = await hre.viem.getPublicClient();

  const tokenAddresses = [
    "0x5f0b1a82749cb4e2278ec87f8bf6b618dc71a8bf",
    "0x48f80608b672dc30dc7e3dbbd0343c5f02c738eb",
    "0x0cbe0df132a6c6b4a2974fa1b7fb953cf0cc798a",
    "0xfc9201f4116ae6b054722e10b98d904829b469c3",
    "0x1de70f3e971b62a0707da18100392af14f7fb677",
    "0x13a0c5930c028511dc02665e7285134b6d11a5f4",
    "0xd97b1de3619ed2c6beb3860147e30ca8a7dc9891",
    "0xadf73eba3ebaa7254e859549a44c74ef7cff7501",
    "0x7c8dda80bbbe1254a7aacf3219ebe1481c6e01d7",
    "0x96152e6180e085fa57c7708e18af8f05e37b479d",
    "0x05ba149a7bd6dc1f937fa9046a9e05c05f3b18b0",
    "0x91d4f0d54090df2d81e834c3c8ce71c6c865e79f",
    "0xdbff6471a79e5374d771922f2194eccc42210b9f",
  ];
  const beamAlgebraCommunityVault = getContract({
    address: getAddress("0xDe3b76539271E2c634f0c41F5261855234d05879"),
    abi: ABI_AlgebraCommunityVault,
    client: {public: publicClient, wallet: walletClient},
  })

  let claimList: {token: Address, amount: bigint}[] = [];
  for await (const tokenAddress of tokenAddresses) {
    const token = getContract({address: getAddress(tokenAddress),
      abi: ABI_ERC20, client: publicClient
    });
    const name = await token.read.name();
    const balance = await token.read.balanceOf([beamAlgebraCommunityVault.address,]);
    claimList.push({token: token.address, amount: balance});
    console.log(`Balance for token ${name} ${token.address}: ${balance}`);
  }
  const rawTx = encodeFunctionData({
    abi: ABI_AlgebraCommunityVault,
    functionName: "withdrawTokens",
    args: [claimList,],
  })
  console.log(rawTx);
  const hash = await beamAlgebraCommunityVault.write.withdrawTokens([claimList,]);
  await publicClient.waitForTransactionReceipt({ hash });
}

const ABI_ERC20 = [{
  "inputs": [
    {
      "internalType": "address",
      "name": "account",
      "type": "address"
    }
  ],
  "name": "balanceOf",
  "outputs": [
    {
      "internalType": "uint256",
      "name": "",
      "type": "uint256"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
{
  "inputs": [],
  "name": "name",
  "outputs": [
    {
      "internalType": "string",
      "name": "",
      "type": "string"
    }
  ],
  "stateMutability": "view",
  "type": "function"
},
] as const;

const ABI_AlgebraCommunityVault = [{
  "inputs": [
    {
      "components": [
        {
          "internalType": "address",
          "name": "token",
          "type": "address"
        },
        {
          "internalType": "uint256",
          "name": "amount",
          "type": "uint256"
        }
      ],
      "internalType": "struct IAlgebraCommunityVault.WithdrawTokensParams[]",
      "name": "params",
      "type": "tuple[]"
    }
  ],
  "name": "withdrawTokens",
  "outputs": [],
  "stateMutability": "nonpayable",
  "type": "function"
},
] as const;

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
