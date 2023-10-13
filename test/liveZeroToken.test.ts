import {
  LiveZeroToken,
  LiveZeroToken__factory,
} from "../typechain";

import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { solidity } from "ethereum-waffle";

import { 
  BALANCE_ERROR, 
  LZT_ALLOWANCE_ERROR, 
  ZERO_TO_ADDRESS_ERROR, 
} from "./helpers";

chai.use(solidity);
const { expect } = chai;

describe("LiveZeroToken", () => {
  let deployer : SignerWithAddress;
  let mockContract : SignerWithAddress;
  let userA : SignerWithAddress;
  let userB : SignerWithAddress;
  let userC : SignerWithAddress;
  let userD : SignerWithAddress;

  let liveZeroToken : LiveZeroToken;
  let liveZeroFactory : LiveZeroToken__factory;

  const name = "Zero";
  const symbol = "ZERO";

  // Immediately give `msg.sender` a balance
  const amount = hre.ethers.utils.parseEther("1010101");

  before(async () => {
    [
      deployer,
      mockContract,
      userA,
      userB,
      userC,
      userD
    ] = await hre.ethers.getSigners();

    liveZeroFactory = await hre.ethers.getContractFactory("LiveZeroToken");
  });

  beforeEach(async () => {
    // To reset balances between tests we redeploy each time
    liveZeroToken = await hre.upgrades.deployProxy(liveZeroFactory, [name, symbol]) as LiveZeroToken;
    await liveZeroToken.mint(deployer.address, amount)
  });

  describe("Validation", async () => {
    it("should have the correct name", async () => {
      const name = await liveZeroToken.name();
      expect(name).to.eq("Zero");
    });

    it("should have the correct symbol", async () => {
      const symbol = await liveZeroToken.symbol();
      expect(symbol).to.eq("ZERO");
    });

    it("should have the correct decimals", async () => {
      // Expect the default number of decimals
      const decimals = await liveZeroToken.decimals();
      expect(decimals).to.eq(18);
    });

    it("should have the correct total supply", async () => {
      const totalSupply = await liveZeroToken.totalSupply();
      expect(totalSupply).to.eq(amount);
    });

    it("should have the correct balance for the deployer", async () => {
      const balance = await liveZeroToken.balanceOf(deployer.address);
      expect(balance).to.eq(amount);
    });

    it("deployer should have the total supply as balance", async () => {
      const balance = await liveZeroToken.balanceOf(deployer.address);
      const totalSupply = await liveZeroToken.totalSupply();
      expect(balance).to.eq(totalSupply);
    });
  });

  describe("#transferBulk", () => {
    it("Sends the expected amount to each address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userA.address, userB.address, userC.address, userD.address];

      await liveZeroToken.connect(deployer).transferBulk(recipients, amount);

      for (const recipient of recipients) {
        const balance = await liveZeroToken.balanceOf(recipient);
        expect(balance).to.eq(amount);
      }
    });

    it("Fails when the sender does not have enough balance for all transfers", async () => {
      const amount = hre.ethers.utils.parseEther("1");

      const balance = await liveZeroToken.balanceOf(deployer.address);
      // Sender has no balance after transferring it all to D
      await liveZeroToken.connect(deployer).transfer(userD.address, balance);

      const tx = liveZeroToken.connect(deployer).transferBulk([userA.address, userB.address, userC.address], amount);
      await expect(tx).to.be.revertedWith(BALANCE_ERROR);
    });

    it("Fails when one of the recipients is the zero address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userA.address, userB.address, userC.address, hre.ethers.constants.AddressZero];

      const tx = liveZeroToken.connect(deployer).transferBulk(recipients, amount);
      await expect(tx).to.be.revertedWith(ZERO_TO_ADDRESS_ERROR);
    });
  });

  describe("#transferFromBulk", () => {
    it("Sends the expected amount to each address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address];

      await liveZeroToken.connect(deployer).approve(userA.address, amount.mul(recipients.length));
      await liveZeroToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);

      for (const recipient of recipients) {
        const balance = await liveZeroToken.balanceOf(recipient);
        expect(balance).to.eq(amount);
      }
    });

    it("Fails when the sender does not have enough allowance for all transfers", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address];

      await liveZeroToken.connect(deployer).approve(userA.address, amount.mul(recipients.length - 1));

      const tx = liveZeroToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);
      await expect(tx).to.be.revertedWith(LZT_ALLOWANCE_ERROR);
    });

    it("Fails when the sender does not have enough balance for all transfers", async () => {
      const amount = hre.ethers.utils.parseEther("1");

      const recipients = [userB.address, userC.address, userD.address];

      // Sender has no balance after transferring it all to D
      const balance = await liveZeroToken.balanceOf(deployer.address);
      await liveZeroToken.connect(deployer).transfer(userD.address, balance);
      await liveZeroToken.connect(deployer).approve(mockContract.address, amount.mul(recipients.length));

      const tx = liveZeroToken.connect(mockContract).transferFromBulk(deployer.address, recipients, amount);
      await expect(tx).to.be.revertedWith(BALANCE_ERROR);
    });

    it("Fails when one of the recipients is the zero address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, hre.ethers.constants.AddressZero];

      await liveZeroToken.connect(deployer).approve(mockContract.address, amount.mul(recipients.length));

      const tx = liveZeroToken.connect(mockContract).transferFromBulk(deployer.address, recipients, amount);
      await expect(tx).to.be.revertedWith(ZERO_TO_ADDRESS_ERROR);
    });
  });
});