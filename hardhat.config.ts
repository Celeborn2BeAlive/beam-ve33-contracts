import { HardhatUserConfig } from "hardhat/types";

import "@nomiclabs/hardhat-waffle";

import "@openzeppelin/hardhat-upgrades";

import "hardhat-tracer";
import "hardhat-gas-reporter";

import "@nomicfoundation/hardhat-verify";
import "@nomicfoundation/hardhat-foundry";
import "@nomicfoundation/hardhat-viem";
import "@nomicfoundation/hardhat-ignition-viem";

const { PRIVATEKEY, PRIVATEKEYSECRET, APIKEY_POLYGONSCAN, APIKEY_ZK, APIKEY_BLOCKSCOUT_ZETACHAIN } = require("./pvkey.js");
const { HARDHAT_NETWORK } = process.env;
const { ZETACHAIN_RPC_URL } = process.env;

const config: HardhatUserConfig = {
  // latest Solidity version
  gasReporter: {
    enabled: true
  },
  sourcify: {
    enabled: true
  },
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
    bsc: {
      url: "https://bsc-dataseed1.binance.org",
      chainId: 56,
      accounts: PRIVATEKEY,
    },

    polygon: {
      url: "https://polygon-mainnet.infura.io/v3/28b6e1b06d8b4cbcaaf8d7065ee116f3",
      // url: "https://polygon-rpc.com",
      chainId: 137,
      accounts: PRIVATEKEY,
      gasPrice: 600e9,
    },

    "polygon-zkevm": {
      url: "https://zkevm-rpc.com",
      accounts: PRIVATEKEY,
    },

    optimism: {
      url: "https://zkevm-rpc.com",
      accounts: PRIVATEKEYSECRET,
      gasPrice: 500e9,
    },

    bscTestnet: {
      url: "https://data-seed-prebsc-1-s1.binance.org:8545",
      chainId: 97,
      accounts: PRIVATEKEY,
    },

    op: {
      url: "https://mainnet.optimism.io",
      chainId: 10,
      accounts: PRIVATEKEY,
    },

    zetachain: {
      // url: `https://zetachain-mainnet.public.blastapi.io`,
      url: ZETACHAIN_RPC_URL || `https://zeta-chain.drpc.org`,
      chainId: 7000,
      accounts: PRIVATEKEY,
    },

    hardhat: {
      // forking: {
      //   url: "https://polygon-mainnet.infura.io/v3/28b6e1b06d8b4cbcaaf8d7065ee116f3",
      // },
      //accounts: []
    },
  },

  etherscan: {
    apiKey: { polygon: APIKEY_POLYGONSCAN, "polygon-zkevm": APIKEY_ZK, zetachain: APIKEY_BLOCKSCOUT_ZETACHAIN },
    customChains: [
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com",
        },
      },
      {
        network: "polygon-zkevm",
        chainId: 1101,
        urls: {
          apiURL: "https://api-zkevm.polygonscan.com/api",
          browserURL: "https://zkevm.polygonscan.com",
        },
      },
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
