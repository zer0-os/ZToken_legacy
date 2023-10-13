import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { solidity } from "ethereum-waffle";

import {
  LiveZeroToken__factory,
  MeowToken__factory,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
  ZeroToken__factory,
} from "../typechain";

import { impersonate } from "./helpers";

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
  const proxyAddress = "0x0eC78ED49C2D27b315D462d43B5BAB94d2C79bf8";
  const ownerAddress = "0xeB3c46986aA0717f5C19f9AAEEBAAB5Fd751DaA6";
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

    // Get proxy admin as though it were an EOA
    mockProxyAdmin = await impersonate(proxyAdminAddress);
  });

  it("Passes validation against local zero contract", async () => {
    // Will throw if not upgrade safe
    await hre.upgrades.validateUpgrade(
      zeroFactory,
      meowFactory,
      {
        kind : "transparent"
      }
    );
  });

  it("Passes validation against mainnet zero contract", async () => {
    // Will throw if not upgrade safe
    const call = hre.upgrades.validateUpgrade(
      liveZeroFactory,
      meowFactory,
      {
        kind : "transparent"
      }
    );
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
    // we cannot use it to upgrade directly through hardhat. Instead we 
    const proxyAdmin = ProxyAdmin__factory.connect(proxyAdminAddress, deployer);
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
});
