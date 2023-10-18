import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import chaiAsPromised from "chai-as-promised";
import { solidity } from "ethereum-waffle";

import {
  ZeroToken__factory,
  MeowTokenTest__factory,
  ProxyAdmin__factory,
  TransparentUpgradeableProxy__factory,
} from "../typechain";

import { 
  impersonate,
  PROXY_ADDRESS,
  PROXY_ADMIN_ADDRESS,
  IMPL_ADDRESS,
  MULTISIG_ADDRESS
} from "./helpers";

chai.use(chaiAsPromised);
// Initialize should API
chai.should();
chai.use(solidity);

const { expect } = chai;

describe("Test upgradability for Zero -> Meow ERC20", () => {
  let deployer : SignerWithAddress;
  let mainnetMultisig : SignerWithAddress
  let mockProxyAdmin : SignerWithAddress;

  let zeroFactory : ZeroToken__factory;
  let meowFactory : MeowTokenTest__factory;

  before(async () => {
    [deployer] = await hre.ethers.getSigners();

    zeroFactory = await hre.ethers.getContractFactory("ZeroToken");
    meowFactory = await hre.ethers.getContractFactory("MeowTokenTest");

    await hre.upgrades.forceImport(IMPL_ADDRESS, zeroFactory)

    // Get owner of proxy admin (multisig)
    mainnetMultisig = await impersonate(MULTISIG_ADDRESS);

    // Get proxy admin as though it were an EOA, not a contract
    mockProxyAdmin = await impersonate(PROXY_ADMIN_ADDRESS);
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
      zeroFactory,
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
        zeroFactory,
        failTokenFactory,
        {
          kind : "transparent"
        }
      );
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err : any) {
      expect(err.message).contains("is not upgrade safe");
    }
  });

  it("Does upgrade from live zero token proxy admin", async () => {
    // Must register in manifest
    await hre.upgrades.forceImport(PROXY_ADDRESS, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Because the mainnet proxy admin is different from the forked hardhat admin,
    // we cannot use it to upgrade directly through hardhat. Instead we must use
    // the factory
    const proxyAdmin = ProxyAdmin__factory.connect(PROXY_ADMIN_ADDRESS, mainnetMultisig);
    const tx = proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, meowTokenImpl.toString());
    await expect(tx).to.not.be.reverted;
  });

  it("Does upgrade from live token through the proxy", async () => {
    // Must register in manifest
    await hre.upgrades.forceImport(PROXY_ADDRESS, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Only the ProxyAdmin can call `upgradeTo` on the proxy directly, so we
    // spoof that address when we call it here
    const proxy = TransparentUpgradeableProxy__factory.connect(PROXY_ADDRESS, mockProxyAdmin);
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

    const liveZeroToken = ZeroToken__factory.connect(PROXY_ADDRESS, mainnetMultisig);
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
    await hre.upgrades.forceImport(PROXY_ADDRESS, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Because the mainnet proxy admin is different from the forked hardhat admin,
    // we cannot use it to upgrade directly through hardhat. Instead we must use
    // the factort
    const proxyAdmin = ProxyAdmin__factory.connect(PROXY_ADMIN_ADDRESS, mainnetMultisig);
    await proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, meowTokenImpl.toString());

    const afterProps = await Promise.all(props);

    expect(beforeProps).to.deep.eq(afterProps);
  });

  it("Disallows further upgrades after an initial upgrade is done", async () => {
    // Must register in manifest
    await hre.upgrades.forceImport(PROXY_ADDRESS, zeroFactory)

    const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

    // Only the ProxyAdmin can call `upgradeTo` on the proxy directly, so we
    // spoof that address when we call it here
    // const proxy = TransparentUpgradeableProxy__factory.connect(PROXY_ADDRESS, mockProxyAdmin);
    // await proxy.connect(mockProxyAdmin).upgradeTo(meowTokenImpl.toString());

    // Transfer the owner of admin
    const proxyAdmin = ProxyAdmin__factory.connect(PROXY_ADMIN_ADDRESS, mainnetMultisig);
    await proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, meowTokenImpl.toString());

    // By renouncing ownership we're disabling the ability to upgrade in the future
    await proxyAdmin.connect(mainnetMultisig).renounceOwnership();

    // Attempt to upgrade again
    const tx = proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, meowTokenImpl.toString());
    await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
  });
});
