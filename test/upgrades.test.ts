import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";

import {
  LiveZeroToken__factory,
  MeowToken__factory,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
  ZeroToken__factory,
} from "../typechain";

import { impersonate } from "./helpers";

chai.use(chaiAsPromised);
// Initialize should API
chai.should();
chai.use(solidity);

const { expect } = chai;

describe("Test upgradability for Zero -> Meow ERC20", () => {
  let deployer : SignerWithAddress;
  let mainnetMultisig : SignerWithAddress
  let mockProxyAdmin : SignerWithAddress;

  let zeroFactory : ZeroToken__factory; // contract at commit efb6bc46
  let liveZeroFactory : LiveZeroToken__factory; // contract on mainnet
  let meowFactory : MeowToken__factory;

  const implAdddress = "0xB8a9c7b782056edFC9E4585B14f078B5dd63994b";
  const proxyAddress = "0x0eC78ED49C2D27b315D462d43B5BAB94d2C79bf8"; // token
  const ownerAddress = "0xeB3c46986aA0717f5C19f9AAEEBAAB5Fd751DaA6"; // ???
  const multisigAddress = "0x5eA627ba4cA4e043D38DE4Ad34b73BB4354daf8d"; // owner of proxy admin and token proxy

  const proxyAdminAddress = "0x5DC79cF30BDc7eAD0AfD107f3ab3494fB666b86C"; // is contract

  before(async () => {
    [deployer] = await hre.ethers.getSigners();

    zeroFactory = await hre.ethers.getContractFactory("ZeroToken");
    liveZeroFactory = await hre.ethers.getContractFactory("LiveZeroToken");
    meowFactory = await hre.ethers.getContractFactory("MeowToken");

    await hre.upgrades.forceImport(implAdddress, liveZeroFactory)

    // Get owner of proxy admin (multisig)
    mainnetMultisig = await impersonate(multisigAddress);

    // Get proxy admin as though it were an EOA, not a contract
    mockProxyAdmin = await impersonate(proxyAdminAddress);
  });

  it("Passes validation against local zero contract", async () => {
    // Will throw if not upgrade safe
    await expect(hre.upgrades.validateUpgrade(
      zeroFactory,
      meowFactory,
      {
        kind : "transparent"
      }
    )).to.not.be.rejected;
  });

  it("Passes validation against mainnet zero contract", async () => {
    // Will throw if not upgrade safe
    await expect(hre.upgrades.validateUpgrade(
      liveZeroFactory,
      meowFactory,
      {
        kind: "transparent"
      }
    )).to.not.be.rejected;
  });

  it("Confirms the validation by failing with an invalid contract", async () => {
    // By making use of the built in `selfdestruct` function for Solidity, the 
    // upgradability is invalid and so we expect this check to throw an error
    const failTokenFactory = await hre.ethers.getContractFactory("FailToken", deployer);

    try {
      await hre.upgrades.validateUpgrade(
        liveZeroFactory,
        failTokenFactory,
        {
          kind : "transparent"
        }
      );
    } catch (err : any) {
      expect(err.message).contains("is not upgrade safe");
    }
  });

  it("Does upgrade from live zero token", async () => {
    // Must register in manifest
    await hre.upgrades.forceImport(proxyAddress, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Because the mainnet proxy admin is different from the forked hardhat admin,
    // we cannot use it to upgrade directly through hardhat. Instead we must use
    // the factory
    const proxyAdmin = ProxyAdmin__factory.connect(proxyAdminAddress, mainnetMultisig);
    const tx = proxyAdmin.connect(mainnetMultisig).upgrade(proxyAddress, meowTokenImpl.toString());
    await expect(tx).to.not.be.reverted;
  });

  it("Does upgrade from live token through the proxy", async () => {
    // Must register in manifest
    await hre.upgrades.forceImport(proxyAddress, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Only the ProxyAdmin can call `upgradeTo` on the proxy directly, so we
    // spoof that address when we call it here
    const proxy = TransparentUpgradeableProxy__factory.connect(proxyAddress, mockProxyAdmin);
    const tx = proxy.connect(mockProxyAdmin).upgradeTo(meowTokenImpl.toString());

    await expect(tx).to.not.be.reverted;
  });

  it("Confirms data is maintained after upgrade", async () => {
    // Assortment of real addresses from mainnet
    const users = [
      "0x751067B875177eCEACD659f2D7435150c877aCbe",
      "0x9222457A8a8f9b63DFdc5Ab98a781E1e6959ccCE",
      "0x9F10B8B12dD1b26Edcd6f13330Af49Ae64d28a71",
      "0xC4A9e47bAd1FF36AbAb31Fd4099588Fb7f46488c",
      "0xf50E36F77d041d3b842B102579356e1d297D9ae7"
    ]

    const liveZeroToken = LiveZeroToken__factory.connect(proxyAddress, mainnetMultisig);
    const props = [
      liveZeroToken.name(),
      liveZeroToken.symbol(),
      liveZeroToken.totalSupply(),
    ];

    for (const user of users) {
      props.push(liveZeroToken.balanceOf(user));
    }

    const beforeProps = await Promise.all(props);

    // Now we perform the upgrade to MEOW token
    await hre.upgrades.forceImport(proxyAddress, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Because the mainnet proxy admin is different from the forked hardhat admin,
    // we cannot use it to upgrade directly through hardhat. Instead we must use
    // the factort
    const proxyAdmin = ProxyAdmin__factory.connect(proxyAdminAddress, mainnetMultisig);
    await proxyAdmin.connect(mainnetMultisig).upgrade(proxyAddress, meowTokenImpl.toString());

    const afterProps = await Promise.all(props);

    expect(beforeProps).to.deep.eq(afterProps);
  });

  // TODO add tests to run same token tests we already have but for before and after the upgrade
  // TODO add tests for a testnet fork

  // TODO how else can this be done? Transfers to 0x0 address are not allowed
  // it("Disallows further upgrades after an initial upgrade is done", async () => {
  //   // Must register in manifest
  //   await hre.upgrades.forceImport(proxyAddress, zeroFactory)

  //   const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

  //   // Only the ProxyAdmin can call `upgradeTo` on the proxy directly, so we
  //   // spoof that address when we call it here
  //   const proxy = TransparentUpgradeableProxy__factory.connect(proxyAddress, mockProxyAdmin);
  //   const tx = proxy.connect(mockProxyAdmin).upgradeTo(meowTokenImpl.toString());

  //   // await expect(tx).to.not.be.reverted;

  //   // Transfer the owner of admin
  //   const proxyAdmin = ProxyAdmin__factory.connect(proxyAdminAddress, mainnetMultisig);

  //   // By transferring ownership of the proxy admin we're disabling the ability to upgrade in the future
  //   const transferTx = await proxyAdmin.connect(mainnetMultisig).transferOwnership(hre.ethers.constants.AddressZero);
  //   await expect(transferTx).to.not.be.reverted;
  // });
});
