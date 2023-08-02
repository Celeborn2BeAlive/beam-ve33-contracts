require("@nomiclabs/hardhat-waffle");

require("@openzeppelin/hardhat-upgrades");

require("@nomiclabs/hardhat-etherscan");

require("@nomiclabs/hardhat-web3");

require("hardhat-tracer");

const { PRIVATEKEY, APIKEY } = require("./pvkey.js");

module.exports = {
  // latest Solidity version
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
      url: "https://polygon-rpc.com",
      chainId: 137,
      accounts: PRIVATEKEY,
      gasPrice: 400e9,
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
        url: "https://polygon-rpc.com",
        chainId: 137,
      },
      //accounts: []
    },
  },

  etherscan: {
    apiKey: APIKEY,
    customChains: [
      {
        network: "polygon",
        chainId: 137,
        urls: {
          apiURL: "https://api.polygonscan.com/api",
          browserURL: "https://polygonscan.com",
        },
      },
    ],
  },

  mocha: {
    timeout: 100000000,
  },
};
