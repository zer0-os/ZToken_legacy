import {
  ZeroToken,
  ZeroToken__factory,
  MeowTokenTest,
  MeowTokenTest__factory,
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

describe("ZeroToken -> MeowToken", () => {
  let deployer : SignerWithAddress;
  let mockContract : SignerWithAddress;
  let userA : SignerWithAddress;
  let userB : SignerWithAddress;
  let userC : SignerWithAddress;
  let userD : SignerWithAddress;

  let mainnetMultisig : SignerWithAddress;

  let zeroToken : ZeroToken;
  let liveZeroFactory : ZeroToken__factory;

  let meowToken : MeowTokenTest;
  let meowFactory : MeowTokenTest__factory;

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

    liveZeroFactory = await hre.ethers.getContractFactory("ZeroToken");
    meowFactory = await hre.ethers.getContractFactory("MeowTokenTest");
    proxyAdminFactory = await hre.ethers.getContractFactory("ProxyAdmin");
  });

  // Spoofed portion of tests, don't need live contract yet to validate behavior
  // of shared functions with MeowToken
  describe("ZeroToken", async () => {
    beforeEach(async () => {
      // To reset balances between tests we redeploy each time
      zeroToken = await hre.upgrades.deployProxy(liveZeroFactory, [name, symbol]) as ZeroToken;
      await zeroToken.mint(deployer.address, amount);
    });

    describe("Validation", async () => {
      it("should have the correct name", async () => {
        const name = await zeroToken.name();
        expect(name).to.eq(name);
      });

      it("should have the correct symbol", async () => {
        const symbol = await zeroToken.symbol();
        expect(symbol).to.eq(symbol);
      });

      it("should have the correct decimals", async () => {
        // Expect the default number of decimals
        const decimals = await zeroToken.decimals();
        expect(decimals).to.eq(18);
      });

      it("should have the correct total supply", async () => {
        const totalSupply = await zeroToken.totalSupply();
        expect(totalSupply).to.eq(amount);
      });
    });

    describe("#transferBulk", () => {
      it("Sends the expected amount to each address", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userA.address, userB.address, userC.address, userD.address];

        await zeroToken.connect(deployer).transferBulk(recipients, amount);

        for (const recipient of recipients) {
          const balance = await zeroToken.balanceOf(recipient);
          expect(balance).to.eq(amount);
        }
      });

      it("Fails when the sender does not have enough balance for all transfers", async () => {
        const amount = hre.ethers.utils.parseEther("1");

        const balance = await zeroToken.balanceOf(deployer.address);
        // Sender has no balance after transferring it all to D
        await zeroToken.connect(deployer).transfer(userD.address, balance);

        const tx = zeroToken.connect(deployer).transferBulk([userA.address, userB.address, userC.address], amount);
        await expect(tx).to.be.revertedWith(BALANCE_ERROR);
      });

      it("Fails when one of the recipients is the zero address", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userA.address, userB.address, userC.address, hre.ethers.constants.AddressZero];

        const tx = zeroToken.connect(deployer).transferBulk(recipients, amount);
        await expect(tx).to.be.revertedWith(ZERO_TO_ADDRESS_ERROR);
      });
    });

    describe("#transferFromBulk", () => {
      it("Sends the expected amount to each address", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userB.address, userC.address, userD.address];

        await zeroToken.connect(deployer).approve(userA.address, amount.mul(recipients.length));
        await zeroToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);

        for (const recipient of recipients) {
          const balance = await zeroToken.balanceOf(recipient);
          expect(balance).to.eq(amount);
        }
      });

      it("Fails when the sender does not have enough allowance for all transfers", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userB.address, userC.address, userD.address];

        await zeroToken.connect(deployer).approve(userA.address, amount.mul(recipients.length - 1));

        const tx = zeroToken.connect(userA).transferFromBulk(deployer.address, recipients, amount);
        await expect(tx).to.be.revertedWith(LZT_ALLOWANCE_ERROR);
      });

      it("Fails when the sender does not have enough balance for all transfers", async () => {
        const amount = hre.ethers.utils.parseEther("1");

        const recipients = [userB.address, userC.address, userD.address];

        // Sender has no balance after transferring it all to D
        const balance = await zeroToken.balanceOf(deployer.address);
        await zeroToken.connect(deployer).transfer(userD.address, balance);
        await zeroToken.connect(deployer).approve(mockContract.address, amount.mul(recipients.length));

        const tx = zeroToken.connect(mockContract).transferFromBulk(deployer.address, recipients, amount);
        await expect(tx).to.be.revertedWith(BALANCE_ERROR);

        // Send back after error is confirmed
        await zeroToken.connect(userD).transfer(deployer.address, balance);

      });

      it("Fails when one of the recipients is the zero address", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userB.address, userC.address, hre.ethers.constants.AddressZero];

        await zeroToken.connect(deployer).approve(mockContract.address, amount.mul(recipients.length));

        const tx = zeroToken.connect(mockContract).transferFromBulk(deployer.address, recipients, amount);
        await expect(tx).to.be.revertedWith(ZERO_TO_ADDRESS_ERROR);
      });
    });
  });

  describe("MeowToken", async () => {
    before(async () => {
      await hre.upgrades.forceImport(PROXY_ADDRESS, liveZeroFactory);
      zeroToken = liveZeroFactory.attach(PROXY_ADDRESS);

      // When running multiple test files, HH will maintain some state on
      // its local between them. This causes overlap in some cases where we don't
      // manually reset state ourselves. As a result, we redeploy the proxy here to
      // be the original zero token to be able to call to `mint` to give the deployer
      // funds for these tests. We then upgrade to back MeowToken.
      const proxyAdmin = proxyAdminFactory.attach(PROXY_ADMIN_ADDRESS);

      const zeroTokenImpl = await hre.upgrades.deployImplementation(liveZeroFactory);
      await proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, zeroTokenImpl.toString());

      // Give deployer funds for tests
      await zeroToken.connect(mainnetMultisig).mint(deployer.address, amount);

      // Then upgrade to MeowToken
      const meowTokenImpl = await hre.upgrades.deployImplementation(meowFactory);
      await proxyAdmin.connect(mainnetMultisig).upgrade(PROXY_ADDRESS, meowTokenImpl.toString());

      // Effectively the same as calling zeroLiveToken but use new variable
      // to show that we are referencing the upgraded contract now
      meowToken = meowFactory.attach(PROXY_ADDRESS);
    });

    describe("Validation", async () => {
      it("should have the correct name", async () => {
        const name = await meowToken.name();
        expect(name).to.eq(newName);
      });

      it("should have the correct symbol", async () => {
        const symbol = await meowToken.symbol();
        expect(symbol).to.eq(newSymbol);
      });

      it("should have the correct decimals", async () => {
        // Expect the default number of decimals
        const decimals = await meowToken.decimals();
        expect(decimals).to.eq(18);
      });

      it("should have the correct total supply", async () => {
        const totalSupply = await meowToken.totalSupply();

        // Because ZERO is already on mainnet it has a total supply
        // We require an account with funds for these tests, so minting
        // changes the existing total supply here, but doesn't actually
        // modify anything on mainnet.
        expect(totalSupply).to.eq(amount.mul(2));
      });
    });

    describe("#transferBulk", () => {
      it("Sends the expected amount to each address", async () => {
        const amount = hre.ethers.utils.parseEther("1");
        const recipients = [userA.address, userB.address, userC.address, userD.address];

        await meowToken.connect(deployer).transferBulk(recipients, amount);

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

        // Transfer balance back after tests confirm we failed correctly.
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