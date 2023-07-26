//const ether = require('@openzeppelin/test-helpers/src/ether');
const { ethers  } = require('hardhat');
const { ZERO_ADDRESS } = require("@openzeppelin/test-helpers/src/constants.js");

//chain
const cash = {"address": "0x5D066D022EDE10eFa2717eD3D79f22F949F8C175"}
let whitelisted_tokens = ["0x0d500B1d8E8eF31E21C99d1Db9A6444d3ADf1270","0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619","0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174","0x1BFD67037B42Cf73acF2047067bd4F2C47D9BfD6","0xc2132D05D31c914a87C6611C10748AEb04B58e8F","0x5D066D022EDE10eFa2717eD3D79f22F949F8C175","0x8f3Cf7ad23Cd3CaDbD9735AFf958023239c6A063","0x45c32fA6DF82ead1e2EF74d17b76547EDdFaFF89","0xa3Fa99A148fA48D14Ed51d610c367C61876997F1","0xE0B52e49357Fd4DAf2c15e02058DCE6BC0057db4","0xbC2b48BC930Ddc4E5cFb2e87a45c379Aab3aac5C","0xfa68FB4628DFF1028CFEc22b4162FCcd0d45efb6","0xEe327F889d5947c1dc1934Bb208a1E792F953E96","0x3A58a54C066FdC0f2D55FC9C89F0415C92eBf3C4","0xFbdd194376de19a88118e84E279b977f165d01b8","0x4028cba3965e8Aea7320e9eA50914861A14dc724","0x6749441Fdc8650b5b5a854ed255C82EF361f1596","0x434e7BBBc9ae9F4fFade0B3175FEf6e8A4A1C505"]
const feeLevel = 10000;

//PAIRFACTORY CLASSIC
const pairFactory = {"address": "0x1fC46294195aA87F77fAE299A14Bd1728dC1Cca9"}

//UNISWAPV3
const univ3_factory = {"address": "0x91e1B99072f238352f59e58de875691e20Dc19c1"};

async function main () {
    accounts = await ethers.getSigners();
    owner = accounts[0]

    //const impersonateMyself = await ethers.getImpersonatedSigner("0xc8949dbaf261365083a4b46ab683BaE1C9273203");
    const retro = await ethers.getContractAt("Retro", "0xBFA35599c7AEbb0dAcE9b5aa3ca5f2a79624D8Eb"); //, impersonateMyself);
    console.log('Deploying Contracts... Owner is: ' + owner.address);
    
    data = await ethers.getContractFactory("VeArtProxyUpgradeable");
    veArtProxy = await upgrades.deployProxy(data,[], {initializer: 'initialize'});
    txDeployed = await veArtProxy.deployed();
    console.log("veArtProxy Address: ", veArtProxy.address)

    data = await ethers.getContractFactory("VotingEscrow");
    veRETRO = await data.deploy(retro.address, veArtProxy.address);
    txDeployed = await veRETRO.deployed();
    console.log("veRETRO Address: ", veRETRO.address);

    data = await ethers.getContractFactory("RewardsDistributorV2");
    RewardsDistributor = await data.deploy(veRETRO.address);
    txDeployed = await RewardsDistributor.deployed();
    console.log("RewardsDistributorV2 Address: ", RewardsDistributor.address)

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

    data = await ethers.getContractFactory("BribeFactoryV3");
    input = [ZERO_ADDRESS, PermissionsRegistry.address]
    BribeFactoryV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await BribeFactoryV3.deployed();
    console.log("BribeFactoryV3: ", BribeFactoryV3.address)

    UniswapV3Twap = await ethers.getContractFactory("UniswapV3Twap");
    uniswapV3Twap = await UniswapV3Twap.deploy(
      univ3_factory.address,
      retro.address,
      cash.address,
      feeLevel
    );
  
    await uniswapV3Twap.deployed();

    OptionFeeDistributor = await ethers.getContractFactory("OptionFeeDistributor");
    feeDistributor = await OptionFeeDistributor.deploy();
    await feeDistributor.deployed();

    data = await ethers.getContractFactory("GaugeFactoryV2");
    input = [PermissionsRegistry.address]
    GaugeFactoryV2 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2.deployed();
    console.log("GaugeFactoryV2: ", GaugeFactoryV2.address)

    data = await ethers.getContractFactory("GaugeFactoryV2_CL");
    input = [PermissionsRegistry.address, owner.address]
    GaugeFactoryV2_CL = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await GaugeFactoryV2_CL.deployed();
    console.log("GaugeFactoryV2_CL: ", GaugeFactoryV2_CL.address)

    const discount = 50;
    const veDiscount = 0;
    OptionTokenV2 = await ethers.getContractFactory("OptionTokenV2");
    optionTokenV2 = await OptionTokenV2.deploy(
        "Option to buy RETRO",
        "oRETRO",
        owner.address,
        cash.address,
        retro.address,
        uniswapV3Twap.address,
        feeDistributor.address,
        discount,
        veDiscount,
        veRETRO.address
    );
    
    await optionTokenV2.deployed();
    console.log('oRETRO deployed to: ' + optionTokenV2.address)

    tx = await optionTokenV2.addGaugeFactory(GaugeFactoryV2.address)
    await tx.wait();
    tx = await optionTokenV2.addGaugeFactory(GaugeFactoryV2_CL.address)
    await tx.wait();

    tx = await GaugeFactoryV2_CL.setORetro(optionTokenV2.address);
    await tx.wait()
    tx = await GaugeFactoryV2.setORetro(optionTokenV2.address);
    await tx.wait()

    data = await ethers.getContractFactory("VoterV3");
    input = [veRETRO.address, pairFactory.address, GaugeFactoryV2.address, BribeFactoryV3.address]
    VoterV3 = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await VoterV3.deployed();
    console.log("VoterV3: ", VoterV3.address)

    data = await ethers.getContractFactory("ProtocolFeeHandler");
    FeeHandler = await data.deploy(PermissionsRegistry.address, univ3_factory.address, VoterV3.address);
    txDeployed = await FeeHandler.deployed();
    console.log("FeeHandler: ", FeeHandler.address)

    tx = await GaugeFactoryV2_CL.setFeeHandler(FeeHandler.address);
    await tx.wait()

    tx = await BribeFactoryV3.setVoter(VoterV3.address)
    await tx.wait()
    console.log('set Voter for Bribe Factory')

    data = await ethers.getContractFactory("MinterUpgradeable");
    input = [VoterV3.address, veRETRO.address, RewardsDistributor.address]
    minter = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await minter.deployed();
    console.log("Minter: ", minter.address)

    // 0. set minter role in retro
    tx = await retro.setMinter(minter.address)
    await tx.wait()
    console.log('set MinterUpgradeable as minter for Retro')

    // 1. _init() Voter with whitelisted tokens (u can do it later), permission reg and minter
    whitelisted_tokens.push(retro.address)
    tx = await VoterV3._init(whitelisted_tokens, PermissionsRegistry.address, minter.address)
    await tx.wait()
    console.log('finished init of VoterV3')

    // 2. Add GaugeFactoryV2_CL + AlgebraFactory in Voter if CL is used (can be added later if Algebra is not ready)
    tx = await VoterV3.addFactory(univ3_factory.address, GaugeFactoryV2_CL.address);
    await tx.wait()
    console.log('added GaugeFactoryV2_CL as factory for VoterV3')

    // 4. Make sure rewardDistro 'depositor' is the minter
    tx = await RewardsDistributor.setDepositor(minter.address)
    await tx.wait()

    // 5. Make sure VOTER is set in veRETRO (setVoter())
    tx = await veRETRO.setVoter(VoterV3.address)
    await tx.wait()

    // 6. Set TEAM wallet in veRETRO (this wallet can change few params)
    // already done

    // 8. Make sure _dibs and referral fees are set to 0. I would set your multisig as stakingNFT and dibs contract just in case

    data = await ethers.getContractFactory("PairAPI");
    input = [VoterV3.address]
    PairAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await PairAPI.deployed();
    console.log("PairAPI: ", PairAPI.address)

    data = await ethers.getContractFactory("RewardAPI");
    input = [VoterV3.address]
    RewardAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await RewardAPI.deployed();
    console.log("RewardAPI: ", RewardAPI.address)

    data = await ethers.getContractFactory("veNFTAPI");
    input = [VoterV3.address, RewardsDistributor.address, PairAPI.address]
    veNFTAPI = await upgrades.deployProxy(data,input, {initializer: 'initialize'});
    txDeployed = await veNFTAPI.deployed();
    console.log("veNFTAPI: ", veNFTAPI.address)

    data = await ethers.getContractFactory("DistributeFees");
    input = [VoterV3.address, 175]
    DistributeFees = await upgrades.deployProxy(data, input, {initializer: 'initialize'});
    txDeployed = await DistributeFees.deployed();
    console.log("DistributeFees: ", DistributeFees.address)

    console.log('/////////////////////////')
    console.log('check up')
    console.log('/////////////////////////')
    
    console.log('RETRO minter role owner (should be ' + minter.address + '): ' + await retro.minter())

    console.log('veRETRO artProxy (should be '+ veArtProxy.address +'): ' + await veRETRO.artProxy())
    console.log('veRETRO team (should be '+ owner.address +'): ' + await veRETRO.team())
    console.log('veRETRO voter (should be '+ VoterV3.address +'): ' + await veRETRO.voter())

    console.log('RewardsDistributorV2 depositor (should be '+ minter.address +'): ' + await RewardsDistributor.depositor())
    console.log('RewardsDistributorV2 token (should be '+ retro.address +'): ' + await RewardsDistributor.token())
    console.log('RewardsDistributorV2 veRETRO (should be '+ veRETRO.address +'): ' + await RewardsDistributor.voting_escrow())

    console.log('BribeFactoryV3 voter (should be '+ VoterV3.address +'): ' + await BribeFactoryV3.voter())


}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
