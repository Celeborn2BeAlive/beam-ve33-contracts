//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    data = await ethers.getContractFactory("PermissionsRegistry");
    PermissionsRegistry = await data.deploy();
    txDeployed = await PermissionsRegistry.deployed();
    console.log("PermissionsRegistry: ", PermissionsRegistry.address)

    // 3. PermissionRegistry: set the various multisig/emergency council and add any wallet you need to _roles
    const roles = ["VOTER_ADMIN", "GOVERNANCE", "GAUGE_ADMIN", "BRIBE_ADMIN", "FEE_MANAGER", "CL_FEES_VAULT_ADMIN"]
    for(let role of roles){
        tx = await PermissionsRegistry.setRoleFor(owner.address, role);
        await tx.wait()
        console.log('set role ' + role + ' for ' + owner.address);
    }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
