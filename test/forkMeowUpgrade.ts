import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import * as hre from "hardhat";
import { MeowToken, MeowToken__factory } from "../typechain";

describe("MeowToken", () => {

  let owner: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: MeowToken;
  const tokenAddress = "0x0ec78ed49c2d27b315d462d43b5bab94d2c79bf8";
  const multisigAddress = "0x5eA627ba4cA4e043D38DE4Ad34b73BB4354daf8d";
  const proxyAdmin = "0x5dc79cf30bdc7ead0afd107f3ab3494fb666b86c";


  before(async () => {
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


  });


  describe("new implementation tests", async () => {
    it("set of tests", async () => {
      const contract = await hre.ethers.getContractAt("MeowToken", tokenAddress);

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
  });

});
