require("@nomiclabs/hardhat-waffle");

require("@openzeppelin/hardhat-upgrades");

require("@nomiclabs/hardhat-etherscan");

require("@nomiclabs/hardhat-web3");

require("hardhat-tracer");
require("hardhat-gas-reporter");

const { PRIVATEKEY, PRIVATEKEYSECRET, APIKEY, APIKEY_ZK } = require("./pvkey.js");

module.exports = {
  // latest Solidity version
  gasReporter: {
    enabled: true
  },
  solidity: {
    compilers: [
      {
        version: "0.8.13",
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

    hardhat: {
      forking: {
        url: "https://polygon-mainnet.infura.io/v3/28b6e1b06d8b4cbcaaf8d7065ee116f3",
        chainId: 137,
      },
      //accounts: []
    },
  },

  etherscan: {
    apiKey: { polygon: APIKEY, "polygon-zkevm": APIKEY_ZK },
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
    ],
  },

  mocha: {
    timeout: 100000000,
  },
};
