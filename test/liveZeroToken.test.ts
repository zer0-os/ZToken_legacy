import {
  LiveZeroToken,
  LiveZeroToken__factory,
  MeowToken,
  MeowToken__factory,
  ProxyAdmin__factory,
} from "../typechain";

import * as hre from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import chai from "chai";
import { solidity } from "ethereum-waffle";

import {
  BALANCE_ERROR,
  LZT_ALLOWANCE_ERROR,
  MEOW_ALLOWANCE_ERROR,
  MULTISIG_ADDRESS,
  PROXY_ADDRESS,
  PROXY_ADMIN_ADDRESS,
  ZERO_TO_ADDRESS_ERROR,
  impersonate,
} from "./helpers";

chai.use(solidity);
const { expect } = chai;

describe("LiveZeroToken -> MeowToken", () => {
  let deployer : SignerWithAddress;
  let mockContract : SignerWithAddress;
  let userA : SignerWithAddress;
  let userB : SignerWithAddress;
  let userC : SignerWithAddress;
  let userD : SignerWithAddress;

  let mainnetMultisig : SignerWithAddress;

  let liveZeroToken : LiveZeroToken;
  let liveZeroFactory : LiveZeroToken__factory;

  let meowToken : MeowToken;
  let meowFactory : MeowToken__factory;

  let proxyAdminFactory : ProxyAdmin__factory;

  const name = "Zero";
  const symbol = "ZERO";
  const newName = "MEOW";
  const newSymbol = "MEOW"

  // Immediately give `msg.sender` a balance
  const amount = hre.ethers.utils.parseEther("10101010101");

  before(async () => {
    [
      deployer,
      mockContract,
      userA,
      userB,
      userC,
      userD
    ] = await hre.ethers.getSigners();

    mainnetMultisig = await impersonate(MULTISIG_ADDRESS)

    liveZeroFactory = await hre.ethers.getContractFactory("LiveZeroToken");
    meowFactory = await hre.ethers.getContractFactory("MeowToken");
    proxyAdminFactory = await hre.ethers.getContractFactory("ProxyAdmin");
  });

  // Spoofed portion of tests, don't need live contract yet to validate behavior
  // of shared functions with MeowToken
  describe("LiveZeroToken", async () => {
    beforeEach(async () => {
      // To reset balances between tests we redeploy each time
      liveZeroToken = await hre.upgrades.deployProxy(liveZeroFactory, [name, symbol]) as LiveZeroToken;
      await liveZeroToken.mint(deployer.address, amount);
    });

    describe("Validation", async () => {
      it("should have the correct name", async () => {
        const name = await liveZeroToken.name();
        expect(name).to.eq(name);
      });

      it("should have the correct symbol", async () => {
        const symbol = await liveZeroToken.symbol();
        expect(symbol).to.eq(symbol);
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

  describe("MeowToken", async () => {
    before(async () => {
      await hre.upgrades.forceImport(PROXY_ADDRESS, liveZeroFactory);
      liveZeroToken = liveZeroFactory.attach(PROXY_ADDRESS);

      // Give deployer funds for tests
      await liveZeroToken.connect(mainnetMultisig).mint(deployer.address, amount);

      const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);

      const proxyAdmin = proxyAdminFactory.attach(PROXY_ADMIN_ADDRESS);

      await proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, meowTokenImpl.toString()); 

      // Effectively the same as calling zeroLiveToken but use new variable
      // to show that we are referencing the upgraded contract now
      meowToken = meowFactory.attach(PROXY_ADDRESS);

      // Clear balance from prior group of tests
      const recipients = [userA, userB, userC, userD];
      for(const recipient of recipients) { // not necessary loop
        const balance = await meowToken.balanceOf(recipient.address);
        await meowToken.connect(recipient).transfer(deployer.address, balance);
      }
    });

    describe("Validation", async () => {
      it("should have the correct name", async () => {
        const name = await meowToken.name();
        expect(name).to.eq("MEOW");
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

        // Already have a total supply, but also have to mint for tests
        // by giving deployer funds
        // TODO resolve another way?
        const balance = await meowToken.balanceOf(deployer.address);
        expect(totalSupply).to.eq(amount.add(balance));
      });
    });

    describe("#transferBulk", () => {
      it("Sends the expected amount to each address", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userA.address, userB.address, userC.address, userD.address];

        await meowToken.connect(deployer).transferBulk(recipients, amount);

        // TODO fix this
        const recipientsSigners = [userA, userB, userC, userD];

        for (const recipient of recipientsSigners) {
          const balance = await meowToken.balanceOf(recipient.address);
          expect(balance).to.eq(amount);
          // Return funds once confirmed
          await meowToken.connect(recipient).transfer(deployer.address, balance);
        }
      });

      it("Fails when the sender does not have enough balance for all transfers", async () => {
        const amount = hre.ethers.utils.parseEther("1");

        const balance = await meowToken.balanceOf(deployer.address);
        // Sender has no balance after transferring it all to D
        await meowToken.connect(deployer).transfer(userD.address, balance);

        const tx = meowToken.connect(deployer).transferBulk([userA.address, userB.address, userC.address], amount);
        await expect(tx).to.be.revertedWith(BALANCE_ERROR);

        // Transfer balance back after tests confirms we failed correctly.
        await meowToken.connect(userD).transfer(deployer.address, balance);
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

      it("Fails when the sender does not have enough allowance for all transfers", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userB.address, userC.address, userD.address];

        await meowToken.connect(deployer).approve(userA.address, amount.mul(recipients.length - 1));

        const tx = meowToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);
        await expect(tx).to.be.revertedWith(MEOW_ALLOWANCE_ERROR);
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

        // Transfer balance back after tests confirms we failed correctly.
        await meowToken.connect(userD).transfer(deployer.address, balance);
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
});