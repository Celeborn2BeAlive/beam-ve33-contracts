import hre from "hardhat";
import { beamAlgebraFactory, beamMultisigAddress } from "../ignition/modules/constants";
import { expect } from "chai";
import { impersonateAccount } from "@nomicfoundation/hardhat-toolbox-viem/network-helpers";

const isLocalhost = hre.network.name == "localhost";
// Tutorial: https://medium.com/@lee.marreros/the-complete-hardhat-testing-guide-for-secure-smart-contracts-a8271893606c#fa46

describe("AlgebraFactory", function() {
  before(async function () {
    if (!isLocalhost) {
      this.skip();
    }
    await impersonateAccount(beamMultisigAddress);
  });

  it("should have Beam multisig has owner", async () => {
    const algebraFactory = await hre.viem.getContractAt("IAlgebraFactory", beamAlgebraFactory);
    expect(await algebraFactory.read.owner()).to.equal(beamMultisigAddress)

    await algebraFactory.write.startRenounceOwnership({
      account: beamMultisigAddress,
    })

    await algebraFactory.write.stopRenounceOwnership({
      account: beamMultisigAddress,
    })
  });
})
