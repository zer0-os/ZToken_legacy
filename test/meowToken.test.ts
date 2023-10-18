import {
  MeowTokenTest,
  MeowTokenTest__factory,
} from "../typechain";

import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { solidity } from "ethereum-waffle";

import { 
  ALLOWANCE_ERROR, 
  BALANCE_ERROR, 
  ZERO_ERROR, 
  ZERO_TO_ADDRESS_ERROR, 
} from "./helpers";

chai.use(solidity);
const { expect } = chai;

describe("MeowToken", () => {
  let deployer : SignerWithAddress;
  let mockContract : SignerWithAddress;
  let userA : SignerWithAddress;
  let userB : SignerWithAddress;
  let userC : SignerWithAddress;
  let userD : SignerWithAddress;

  let meowToken : MeowTokenTest;
  let meowFactory : MeowTokenTest__factory;

  const name = "MeowToken";
  const symbol = "MEOW";

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

    meowFactory = await hre.ethers.getContractFactory("MeowTokenTest");
  });

  beforeEach(async () => {
    // To reset balances between tests we redeploy each time
    meowToken = await hre.upgrades.deployProxy(meowFactory, [name, symbol, amount]) as MeowTokenTest;
  });

  describe("Validation", async () => {
    it("should have the correct name", async () => {
      const name = await meowToken.name();
      expect(name).to.eq("MeowToken");
    });

    it("should have the correct symbol", async () => {
      const symbol = await meowToken.symbol();
      expect(symbol).to.eq("MEOW");
    });

    it("should have the correct decimals", async () => {
      // Expect the default number of decimals
      const decimals = await meowToken.decimals();
      expect(decimals).to.eq(18);
    });

    it("should have the correct total supply", async () => {
      const totalSupply = await meowToken.totalSupply();
      expect(totalSupply).to.eq(amount);
    });

    it("should have the correct balance for the deployer", async () => {
      const balance = await meowToken.balanceOf(deployer.address);
      expect(balance).to.eq(amount);
    });

    it("deployer should have the total supply as balance", async () => {
      const balance = await meowToken.balanceOf(deployer.address);
      const totalSupply = await meowToken.totalSupply();
      expect(balance).to.eq(totalSupply);
    });
  });

  describe("#transferBulk", () => {
    it("Sends the expected amount to each address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userA.address, userB.address, userC.address, userD.address];

      await meowToken.connect(deployer).transferBulk(recipients, amount);

      for (const recipient of recipients) {
        const balance = await meowToken.balanceOf(recipient);
        expect(balance).to.eq(amount);
      }
    });

    it("Burns the amount from total supply after transfer to token contract", async () => {
      const amount = hre.ethers.utils.parseEther("4");
      const recipients = [meowToken.address];
      
      const totalSupplyBefore = await meowToken.totalSupply();

      await meowToken.connect(deployer).transferBulk(recipients, amount);

      const totalSupplyAfter = await meowToken.totalSupply();

      expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(amount));
    });

    it("Burns tokens correctly after bulk transfer to both users and the token contract", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address, meowToken.address];

      const totalSupplyBefore = await meowToken.totalSupply();
      await meowToken.connect(deployer).transferBulk(recipients, amount);

      const totalSupplyAfter = await meowToken.totalSupply();
      expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(amount));
    });

    it("Fails when the sender does not have enough balance for all transfers", async () => {
      const amount = hre.ethers.utils.parseEther("1");

      const balance = await meowToken.balanceOf(deployer.address);
      // Sender has no balance after transferring it all to D
      await meowToken.connect(deployer).transfer(userD.address, balance);

      const tx = meowToken.connect(deployer).transferBulk([userA.address, userB.address, userC.address], amount);
      await expect(tx).to.be.revertedWith(BALANCE_ERROR);
    });

    it("Fails when the transfer amount is zero", async () => {
      const recipients = [userA.address, userB.address, userC.address, userD.address];
      const tx = meowToken.connect(deployer).transferBulk(recipients, 0);

      await expect(tx).to.be.revertedWith(ZERO_ERROR);
    });

    it("Fails when one of the recipients is the zero address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userA.address, userB.address, userC.address, hre.ethers.constants.AddressZero];

      const tx = meowToken.connect(deployer).transferBulk(recipients, amount);
      await expect(tx).to.be.revertedWith(ZERO_TO_ADDRESS_ERROR);
    });
  });

  describe("#transferFromBulk", () => {
    it("Sends the expected amount to each address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address];

      await meowToken.connect(deployer).approve(userA.address, amount.mul(recipients.length));
      await meowToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);

      for (const recipient of recipients) {
        const balance = await meowToken.balanceOf(recipient);
        expect(balance).to.eq(amount);
      }
    });

    it("Burns the amount from total supply after transfer to token contract", async () => {
      const amount = hre.ethers.utils.parseEther("4");
      const recipients = [meowToken.address];
      
      const totalSupplyBefore = await meowToken.totalSupply();

      await meowToken.connect(deployer).approve(userA.address, amount.mul(recipients.length));
      await meowToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);

      const totalSupplyAfter = await meowToken.totalSupply();

      expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(amount));
    });

    it("Burns tokens correctly after bulk transfer to both users and the token contract", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address, meowToken.address];

      await meowToken.connect(deployer).approve(userA.address, amount.mul(recipients.length));

      const totalSupplyBefore = await meowToken.totalSupply();
      await meowToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);

      const totalSupplyAfter = await meowToken.totalSupply();
      expect(totalSupplyAfter).to.eq(totalSupplyBefore.sub(amount));
    })

    it("Fails when the sender does not have enough allowance for all transfers", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address];

      await meowToken.connect(deployer).approve(userA.address, amount.mul(recipients.length - 1));

      const tx = meowToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);
      await expect(tx).to.be.revertedWith(ALLOWANCE_ERROR);
    });

    it("Fails when the sender does not have enough balance for all transfers", async () => {
      const amount = hre.ethers.utils.parseEther("1");

      const recipients = [userB.address, userC.address, userD.address];

      // Sender has no balance after transferring it all to D
      const balance = await meowToken.balanceOf(deployer.address);
      await meowToken.connect(deployer).transfer(userD.address, balance);
      await meowToken.connect(deployer).approve(mockContract.address, amount.mul(recipients.length));

      const tx = meowToken.connect(mockContract).transferFromBulk(deployer.address, recipients, amount);
      await expect(tx).to.be.revertedWith(BALANCE_ERROR);
    });

    it("Fails when the transfer amount is zero", async () => {
      const recipients = [userB.address, userC.address, userD.address];
      const tx = meowToken.connect(deployer).transferFromBulk(deployer.address, recipients, 0);

      await expect(tx).to.be.revertedWith(ZERO_ERROR)
    });

    it("Fails when the sender address is zero", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, userD.address];

      // Because allowance check is done first in ERC20 `transferFromBulk`
      // this will fail before we get the chance to check for 0 address 
      // because allowance will also be 0. Attempts to approve the 0x0
      // address for any reason will fail because ERC20 disallows it
      const tx = meowToken.connect(userA).transferFromBulk(hre.ethers.constants.AddressZero, recipients, amount);
      await expect(tx).to.be.revertedWith(ALLOWANCE_ERROR);
    });

    it("Fails when one of the recipients is the zero address", async () => {
      const amount = hre.ethers.utils.parseEther("1");
      const recipients = [userB.address, userC.address, hre.ethers.constants.AddressZero];

      await meowToken.connect(deployer).approve(mockContract.address, amount.mul(recipients.length));

      const tx = meowToken.connect(mockContract).transferFromBulk(deployer.address, recipients, amount);
      await expect(tx).to.be.revertedWith(ZERO_TO_ADDRESS_ERROR);
    });
  });
});