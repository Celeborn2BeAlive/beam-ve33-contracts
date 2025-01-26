//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { TOKEN_ADDRESS, VEARTPROXY_ADDRESS } = require("./constants.js");

// Depends on:
// - 00_token.js
// - 02_veart_proxy_upgradeable.js

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const retro = await ethers.getContractAt("Retro", TOKEN_ADDRESS);
    const veArtProxy = await ethers.getContractAt("VeArtProxyUpgradeable", VEARTPROXY_ADDRESS);

    data = await ethers.getContractFactory("VotingEscrow");
    veRETRO = await data.deploy(retro.address, veArtProxy.address);
    txDeployed = await veRETRO.deployed();
    console.log("veRETRO Address: ", veRETRO.address);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
