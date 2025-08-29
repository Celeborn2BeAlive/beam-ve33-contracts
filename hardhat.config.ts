import { HardhatUserConfig } from "hardhat/config";

import "@nomiclabs/hardhat-waffle";

import "@openzeppelin/hardhat-upgrades";

import "hardhat-tracer";
import "hardhat-gas-reporter";

import "@nomicfoundation/hardhat-toolbox-viem";
import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-ignition-viem";

const {
  HARDHAT_NETWORK,
  ZETACHAIN_RPC_URL,
  PRIVATEKEY,
  APIKEY_BLOCKSCOUT_ZETACHAIN
} = process.env;

const config: HardhatUserConfig = {
  // latest Solidity version
  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
      {
        version: "0.7.0",
        settings: {
          optimizer: {
            enabled: true,
            runs: 100,
          },
        },
      },
    ],
  },
  defaultNetwork: HARDHAT_NETWORK || "zetachain",
  networks: {
    zetachain: {
      url: ZETACHAIN_RPC_URL || `https://zeta-chain.drpc.org`,
      chainId: 7000,
      accounts: [PRIVATEKEY as `0x${string}`],
    },

    hardhat: {
      accounts: {
        count: 100,
      }
    },

    localhost: {
      forking: {
        url: ZETACHAIN_RPC_URL as string,
        enabled: false, // Comment this line and run `pnpm exec hardhat node` to enable forking
      },
    }
  },
  sourcify: {
    enabled: true
  },
  etherscan: {
    apiKey: {
      zetachain: APIKEY_BLOCKSCOUT_ZETACHAIN
    },
    customChains: [
      {
        network: 'zetachain',
        chainId: 7000,
        urls: {
          apiURL: 'https://zetachain.blockscout.com/api',
          browserURL: 'https://zetachain.blockscout.com',
        },
      }
    ],
  },
  mocha: {
    timeout: 100000000,
  },
};
export default config;
