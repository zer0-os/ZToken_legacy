import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import * as hre from "hardhat";
import { MeowToken, MeowToken__factory } from "../typechain";
import {ethers} from "ethers";

describe("MeowToken", () => {

  let owner: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: MeowToken;
  const tokenAddress = "0x0ec78ed49c2d27b315d462d43b5bab94d2c79bf8";
  const multisigAddress = "0x5eA627ba4cA4e043D38DE4Ad34b73BB4354daf8d";
  const proxyAdmin = "0x5dc79cf30bdc7ead0afd107f3ab3494fb666b86c";
  let contract;
  let snapshotIdBeforeUpgrade;
  let snapshotIdAfterUpgrade;


  before(async () => {
    contract = await hre.ethers.getContractAt("MeowToken", tokenAddress);
    snapshotIdBeforeUpgrade = await hre.network.provider.send("evm_snapshot");
    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: [multisigAddress],
    });
    await hre.network.provider.send("hardhat_setBalance", [
      multisigAddress,
      "0x1000000000000000000000",
    ]);
    owner = await hre.ethers.getSigner(multisigAddress);
    // // [user1, user2, user3] = await hre.ethers.getSigners();
    //
    const tokenArtefact = await hre.ethers.getContractFactory(
      "MeowToken",
      owner
    );
    const newImplementation = await (await tokenArtefact.deploy()).deployed();
    const proxyAdminContract = await hre.ethers.getContractAt("ProxyAdmin", proxyAdmin, owner);
    await proxyAdminContract.upgrade(tokenAddress, newImplementation.address);
    // await proxy.
    console.log(`proxy successfully upgraded to the new implementation ${newImplementation.address}`);


    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xC93dEcFA8b8807E3314729C3DA75Ad2E9bf0C3CB"],
    });
    await hre.network.provider.send("hardhat_setBalance", [
      "0xC93dEcFA8b8807E3314729C3DA75Ad2E9bf0C3CB",
      "0x1000000000000000000000",
    ]);
    user1 = await hre.ethers.getSigner("0xC93dEcFA8b8807E3314729C3DA75Ad2E9bf0C3CB");



    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0xB987A30f3dC2E3C30AEbc20A4B9698F3875217c0"],
    });
    await hre.network.provider.send("hardhat_setBalance", [
      "0xB987A30f3dC2E3C30AEbc20A4B9698F3875217c0",
      "0x1000000000000000000000",
    ]);
    user2 = await hre.ethers.getSigner("0xB987A30f3dC2E3C30AEbc20A4B9698F3875217c0");


    await hre.network.provider.request({
      method: "hardhat_impersonateAccount",
      params: ["0x94F91B1E0c994F3Cca868Db2Fd24cc5d526928Ac"],
    });
    await hre.network.provider.send("hardhat_setBalance", [
      "0x94F91B1E0c994F3Cca868Db2Fd24cc5d526928Ac",
      "0x1000000000000000000000",
    ]);
    user3 = await hre.ethers.getSigner("0x94F91B1E0c994F3Cca868Db2Fd24cc5d526928Ac");
    snapshotIdAfterUpgrade = await hre.network.provider.send("evm_snapshot");


  });


  describe("new implementation tests", async () => {
    it("set of tests", async () => {

      const initialBalance = await contract.totalSupply();

      await contract.connect(user1).transfer(tokenAddress, 1000); // burn 1000 tokens
      expect(await contract.totalSupply()).to.be.equal(initialBalance.sub(1000));

      const user2Amount = await contract.balanceOf(user2.address);
      const user1Amount = await contract.balanceOf(user1.address);

      await contract.connect(user1).transferBulk([tokenAddress, user2.address], 1000);
      expect(await contract.balanceOf(user2.address)).to.be.equal(user2Amount.add(1000));
      expect(await contract.balanceOf(user1.address)).to.be.equal(user1Amount.sub(2000));
      expect(await contract.totalSupply()).to.be.equal(initialBalance.sub(2000));
    });


    it("Test transferFromBulk", async () => {

      const initialBalance = await contract.totalSupply();
      const initialUser1Balance = await contract.balanceOf(user1.address);
      const initialUser2Balance = await contract.balanceOf(user2.address);

      await expect(contract.connect(user2).transferFromBulk(user1.address, [user3.address], 1000)).
        to.be.revertedWith("ERC20: insufficient allowance");
      await contract.connect(user1).approve(user2.address, 2000);
      await expect(contract.connect(user2).transferFromBulk(user1.address,[tokenAddress, user2.address], 1000))
        .to.emit(contract, "Transfer")
        .withArgs(user1.address, tokenAddress, 1000)
        .to.emit(contract, "Transfer")
        .withArgs(tokenAddress, hre.ethers.constants.AddressZero, 1000)
        .to.emit(contract, "Transfer")
        .withArgs(user1.address, user2.address, 1000);

      expect(await contract.totalSupply()).to.be.equal(initialBalance.sub(1000));
      expect(await contract.balanceOf(user2.address)).to.be.equal(initialUser2Balance.add(1000));
      expect(await contract.balanceOf(user1.address)).to.be.equal(initialUser1Balance.sub(2000));

    });
    it("check storage variables after upgrade", async () => {
      const randomHolders = [
        "0xEf147697d948D609F712397Db270234CF155A925",
        "0x766aBC6f937ad9248752A9f3ee8e850755D1438A",
        "0x58DEd8069032DA31CA975D2E0e44a788B71A6e8c",
        "0x1789C3abbDfa049374eE9c6CB37C93833Ae5D8Ea",
        "0x1e11FCAB5BD387bc783F3DD03b379402ee2f9e06",
        "0x0004Cd8474E882278e32E584699090be496f410e",
        ];
      const randomHolderAmounts = [];
      await hre.network.provider.send("evm_revert", [snapshotIdBeforeUpgrade]);
      const totalSupply = await contract.totalSupply();

      const decimals = await contract.decimals();
      const name = await contract.name();
      const symbol = await contract.symbol();
      const owner = await contract.owner();

      for (let i=0; i<randomHolders.length; i++) {
        randomHolderAmounts.push(await contract.balanceOf(randomHolders[i]));
      }
      await hre.network.provider.send("evm_revert", [snapshotIdAfterUpgrade]);
      const randomHoldersAfterUpgrade = [];

      for (let i=0; i<randomHolders.length; i++) {
        randomHoldersAfterUpgrade.push(await contract.balanceOf(randomHolders[i]));
      }
      expect(await contract.totalSupply()).to.be.equal(totalSupply);
      expect(await contract.decimals()).to.be.equal(decimals);
      expect(await contract.name()).to.be.equal(name);
      expect(await contract.symbol()).to.be.equal(symbol);
      expect(await contract.owner()).to.be.equal(owner);
      expect(randomHolderAmounts).to.deep.equal(randomHoldersAfterUpgrade);


    });
  });

});
