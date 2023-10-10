import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ContractTransaction } from "ethers";

import * as hre from "hardhat";

import { MerkleDistributorInfo } from "../utilities/airdrop/createMerkle";

import * as fs from "fs";
import {
  LiveZeroToken,
  LiveZeroToken__factory,
  MeowToken__factory,
  MerkleTokenAirdrop,
  MerkleTokenAirdrop__factory,
  ProxyAdmin,
  TransparentUpgradeableProxy__factory,
  ZeroToken,
  ZeroToken__factory,
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

describe("Test upgradability for Zero -> Meow ERC20", () => {
  let deployer: SignerWithAddress;
  let creator: SignerWithAddress;

  let zeroFactory: ZeroToken__factory; // the code at commit efb6bc46
  let liveZeroFactory: LiveZeroToken__factory; // whats on mainnet
  let meowFactory: MeowToken__factory; // new token

  let liveZeroToken: LiveZeroToken;

  const implAdddress = "0xB8a9c7b782056edFC9E4585B14f078B5dd63994b";
  const proxyAddress = "0x0eC78ED49C2D27b315D462d43B5BAB94d2C79bf8";
  const mainnetOwner = "0xeB3c46986aA0717f5C19f9AAEEBAAB5Fd751DaA6";

  beforeEach(async () => {
    [deployer] = await hre.ethers.getSigners();

    // creator

    zeroFactory = await hre.ethers.getContractFactory("ZeroToken");
    liveZeroFactory = await hre.ethers.getContractFactory("LiveZeroToken");
    meowFactory = await hre.ethers.getContractFactory("MeowToken");

    liveZeroToken = liveZeroFactory.attach(implAdddress);
  })

  before(async () => {

  })

  it("passes validation", async () => {
    await hre.upgrades.validateUpgrade(
      zeroFactory,
      meowFactory,
      {
        kind: "transparent"
      }
    );
  });

  it("Connects to live zero, then checks the validation", async () => {
    // Must register in manifest
    await hre.upgrades.forceImport(proxyAddress, zeroFactory)

    await hre.upgrades.validateUpgrade(
      liveZeroToken.address,
      meowFactory,
      {
        kind: "transparent"
      }
    );
  });

  it.only("Does upgrade from live zero token", async () => {
    // Must register in manifest
    const admin = await hre.upgrades.erc1967.getAdminAddress(proxyAddress);
    console.log(admin);


    await hre.upgrades.forceImport(proxyAddress, zeroFactory)
    await hre.upgrades.forceImport(implAdddress, zeroFactory)

    // TransparentUpgradeableProxy__factory.connect
    const prAdmin: ProxyAdmin = await hre.upgrades.admin.getInstance(deployer) as ProxyAdmin;
    console.log(prAdmin.address);

    // const tx = await liveZeroToken.
    // const newAdmin = await hre.upgrades.deployProxyAdmin(deployer);

    // await hre.upgrades.admin.transferProxyAdminOwnership(admin, deployer)
    // await hre.upgrades.admin.changeProxyAdmin(proxyAddress, admin);
    // await hre.upgrades.forceImport(proxyAddress, liveZeroFactory);


    // because manifest is registered with different proxy than whats on mainnet, we register here

    // const txy = await hre.upgrades.upgradeProxy(proxyAddress, meowFactory);
    // console.log(`Successfully upgraded proxy: ${txy.address}`);
  })
  // upgrade by deploying the impl then calling `upgradeTo` on proxy
});
