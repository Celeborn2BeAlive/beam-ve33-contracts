//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { REWARDS_DISTRIBUTOR_ADDRESS, MINTER_ADDRESS } = require('./constants');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    const RewardsDistributor = await ethers.getContractAt("RewardsDistributorV2", REWARDS_DISTRIBUTOR_ADDRESS);
    const minter = await ethers.getContractAt("MinterUpgradeable", MINTER_ADDRESS);

    // 4. Make sure rewardDistro 'depositor' is the minter
    tx = await RewardsDistributor.setDepositor(minter.address)
    await tx.wait()
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
