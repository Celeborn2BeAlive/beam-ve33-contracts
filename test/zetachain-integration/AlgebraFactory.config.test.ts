import hre from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress, ZERO_ADDRESS } from "../../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount, loadFixture, time, mine } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";
import { isLocalhostNetwork, isZetachainForkNetwork } from "../constants";
import { getAddress, parseEther, getContract, Address, formatUnits } from "viem";
import { ABI_WZETA } from "../abi/WZETA";
import { ABI_AlgebraFactory } from "../abi/AlgebraFactory";
import BeamProtocol from "../../ignition/modules/BeamProtocol";
import { create10PercentOfTotalSupplyLock, simulateOneWeekAndFlipEpoch } from "../utils";
import { ABI_AlgebraSwapRouter } from "../abi/AlgebraSwapRouter";
import { ABI_AlgebraEternalFarming } from "../abi/AlgebraEternalFarming";
import { ABI_AlgebraNonFungiblePositionManager } from "../abi/AlgebraNonFungiblePositionManager";
import { ABI_AlgebraFarmingCenter } from "../abi/AlgebraFarmingCenter";

describe("AlgebraFactory.config", function() {
  before(async function () {
    if (!isZetachainForkNetwork) {
      this.skip();
    }
    await impersonateAccount(beamMultisigAddress); // For admin on AlgebraFactory
    await mine(); // Workaround for error "No known hardfork for execution on historical block ..." when forking
  });

  it("Should have Beam multisig as owner()", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    expect(await algebraFactory.read.owner()).to.equal(beamMultisigAddress)
  });

  it("Should allow impersonate as owner()", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    await algebraFactory.write.startRenounceOwnership({
      account: await algebraFactory.read.owner(),
    })

    await algebraFactory.write.stopRenounceOwnership({
      account: await algebraFactory.read.owner(),
    })
  });
})
