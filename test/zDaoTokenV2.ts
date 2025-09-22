import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ZeroDAOToken,
  ZeroDAOToken__factory,
  ERC20Mock,
  ERC20Mock__factory,
  ZeroDAOTokenV2__factory,
  ZeroDAOTokenV2,
} from "../typechain";

import * as hre from "hardhat";

describe("zDAOToken => zDAOTokenV2 Upgrade Test", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let zeroDAOToken: ZeroDAOToken;
  let zeroDAOTokenV2: ZeroDAOTokenV2;
  let mockToken: ERC20Mock;
  // Update as needed for testing
  const decimals = 6;
  const testTokenAmount = ethers.utils.parseUnits("500000", decimals);

  before(async () => {
    accounts = await ethers.getSigners();
    creator = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
  });

  describe("ZeroDAOToken to ZeroDAOTokenV2 upgrade test - mint function removal", () => {
    it("Deploys original ZeroDAOToken contract", async () => {
      // Deploy the original ZeroDAOToken using the original factory
      zeroDAOToken = await hre.upgrades.deployProxy(
        new ZeroDAOToken__factory(creator),
        ["Test DAO Token", "TDT"]
      ) as ZeroDAOToken;

      await zeroDAOToken.deployed();

      // Verify deployment
      expect(await zeroDAOToken.name()).to.eq("Test DAO Token");
      expect(await zeroDAOToken.symbol()).to.eq("TDT");
      expect(await zeroDAOToken.owner()).to.eq(creator.address);
    });

    it("Deploys mock token and mints balance to deployed zeroDAOToken", async () => {
      // Deploy ERC20Mock
      const mockTokenFactory = new ERC20Mock__factory(creator);
      mockToken = await mockTokenFactory.deploy("Test Mock Token", "TMT");
      await mockToken.deployed();

      await mockToken.mint(zeroDAOToken.address, testTokenAmount);

      expect(await mockToken.balanceOf(zeroDAOToken.address)).to.eq(testTokenAmount);
    });

    it("Upgrades ZeroDAOToken to ZeroDAOTokenV2", async () => {
      // Store pre-upgrade state
      const preUpgradeName = await zeroDAOToken.name();
      const preUpgradeSymbol = await zeroDAOToken.symbol();
      const preUpgradeOwner = await zeroDAOToken.owner();
      const preUpgradeTotalSupply = await zeroDAOToken.totalSupply();
      const preUpgradeUser1Balance = await zeroDAOToken.balanceOf(user1.address);
      const preUpgradeContractBalance = await mockToken.balanceOf(zeroDAOToken.address);

      // Perform the upgrade
      zeroDAOTokenV2 = await hre.upgrades.upgradeProxy(
        zeroDAOToken.address,
        new ZeroDAOTokenV2__factory(creator)
      ) as ZeroDAOTokenV2;

      // Verify the upgrade was successful
      expect(zeroDAOTokenV2.address).to.eq(zeroDAOToken.address);

      // Verify state variables are preserved
      expect(await zeroDAOTokenV2.name()).to.eq(preUpgradeName);
      expect(await zeroDAOTokenV2.symbol()).to.eq(preUpgradeSymbol);
      expect(await zeroDAOTokenV2.owner()).to.eq(preUpgradeOwner);
      expect(await zeroDAOTokenV2.totalSupply()).to.eq(preUpgradeTotalSupply);
      expect(await zeroDAOTokenV2.balanceOf(user1.address)).to.eq(preUpgradeUser1Balance);
      expect(await mockToken.balanceOf(zeroDAOToken.address)).to.eq(preUpgradeContractBalance);
    });

    it("calls withdrawERC20 to withdraw that balance amount to an EOA", async () => {
      const initialRecipientBalance = await mockToken.balanceOf(user1.address);
      const initialContractBalance = await mockToken.balanceOf(zeroDAOTokenV2.address);

      // Call withdrawERC20 function
      const tx = await zeroDAOTokenV2.connect(creator).withdrawERC20(
        mockToken.address,
        user1.address,
        testTokenAmount
      );

      // Verify the transaction emitted the correct event
      await expect(tx)
        .to.emit(zeroDAOTokenV2, "ERC20TokenWithdrawn")
        .withArgs(mockToken.address, user1.address, testTokenAmount);

      // Check contract balance (should be 0)
      const finalContractBalance = await mockToken.balanceOf(zeroDAOTokenV2.address);
      expect(finalContractBalance).to.eq(initialContractBalance.sub(testTokenAmount));

      // Check recipient balance (should have received the tokens)
      const finalRecipientBalance = await mockToken.balanceOf(user1.address);
      expect(finalRecipientBalance).to.eq(initialRecipientBalance.add(testTokenAmount));
    });

    it("tests withdrawERC20 with amount 0 (withdraw all)", async () => {
      // First, give the contract some more tokens
      const additionalAmount = ethers.utils.parseUnits("100000", decimals);
      await mockToken.connect(creator).mint(zeroDAOTokenV2.address, additionalAmount);

      const initialRecipientBalance = await mockToken.balanceOf(user2.address);

      // Call withdrawERC20 with amount 0 (should withdraw all)
      const tx = zeroDAOTokenV2.connect(creator).withdrawERC20(
        mockToken.address,
        user2.address,
        0 // This should withdraw total contract balance of `token` given
      );

      // Verify the transaction emitted the correct event with the full amount
      expect(await tx)
        .to.emit(zeroDAOTokenV2, "ERC20TokenWithdrawn")
        .withArgs(mockToken.address, user2.address, additionalAmount);

      // Check final balances
      const finalContractBalance = await mockToken.balanceOf(zeroDAOTokenV2.address);
      const finalRecipientBalance = await mockToken.balanceOf(user2.address);

      expect(finalContractBalance).to.eq(0);
      expect(finalRecipientBalance).to.eq(initialRecipientBalance.add(additionalAmount));
    });

    it("Fails when called by non-owner", async () => {
      // Give the contract some tokens first
      const testAmount = ethers.utils.parseUnits("1000", decimals);
      await mockToken.connect(creator).mint(zeroDAOTokenV2.address, testAmount);

      // Try to call withdrawERC20 from non-owner account
      await expect(
        zeroDAOTokenV2.connect(user1).withdrawERC20(
          mockToken.address,
          user1.address,
          testAmount
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fails when token or recipient address is zero", async () => {
      const testAmount = ethers.utils.parseUnits("1000", decimals);

      // Test zero token address
      await expect(
        zeroDAOTokenV2.connect(creator).withdrawERC20(
          ethers.constants.AddressZero,
          user1.address,
          testAmount
        )
      ).to.be.revertedWith("zDAOToken: Token address cannot be zero");

      // Test zero recipient address
      await expect(
        zeroDAOTokenV2.connect(creator).withdrawERC20(
          mockToken.address,
          ethers.constants.AddressZero,
          testAmount
        )
      ).to.be.revertedWith("zDAOToken: Recipient address cannot be zero");
    });

    it("Fails when contract has insufficient token balance", async () => {
      // Test insufficient balance (contract has 1000, trying to withdraw 2000)
      await expect(
        zeroDAOTokenV2.connect(creator).withdrawERC20(
          mockToken.address,
          user1.address,
          ethers.utils.parseUnits("2000", decimals)
        )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    })
  });

  describe("post-upgrade core functionality", () => {
    it("owner can mint; standard transfer works", async () => {
      expect(await zeroDAOTokenV2.owner()).to.eq(creator.address);
      expect(zeroDAOTokenV2.address).to.eq(zeroDAOToken.address);

      const mintCreator = ethers.utils.parseEther("1000");
      const mintUser1 = ethers.utils.parseEther("100");

      await expect(
        zeroDAOTokenV2.connect(user1).mint(user1.address, mintUser1)
      ).to.be.revertedWith("Ownable: caller is not the owner");

      const creatorBalBefore = await zeroDAOTokenV2.balanceOf(creator.address);
      const user1BalBefore = await zeroDAOTokenV2.balanceOf(user1.address);
      const supplyBefore = await zeroDAOTokenV2.totalSupply();

      await zeroDAOTokenV2.connect(creator).mint(creator.address, mintCreator);
      await zeroDAOTokenV2.connect(creator).mint(user1.address, mintUser1);

      expect(await zeroDAOTokenV2.balanceOf(creator.address)).to.eq(creatorBalBefore.add(mintCreator));
      expect(await zeroDAOTokenV2.balanceOf(user1.address)).to.eq(user1BalBefore.add(mintUser1));
      expect(await zeroDAOTokenV2.totalSupply()).to.eq(supplyBefore.add(mintCreator).add(mintUser1));

      const transferAmt = ethers.utils.parseEther("10");
      const creatorBalBeforeTransfer = await zeroDAOTokenV2.balanceOf(creator.address);
      const user1BalBeforeTransfer = await zeroDAOTokenV2.balanceOf(user1.address);

      await zeroDAOTokenV2.connect(creator).transfer(user1.address, transferAmt);

      expect(await zeroDAOTokenV2.balanceOf(creator.address)).to.eq(creatorBalBeforeTransfer.sub(transferAmt));
      expect(await zeroDAOTokenV2.balanceOf(user1.address)).to.eq(user1BalBeforeTransfer.add(transferAmt));
    });

    it("approve and transferFrom update balances and allowance", async () => {
      const approveAmt = ethers.utils.parseEther("50");
      await zeroDAOTokenV2.connect(creator).approve(user2.address, approveAmt);
      expect(await zeroDAOTokenV2.allowance(creator.address, user2.address)).to.eq(approveAmt);

      const tfAmt = ethers.utils.parseEther("20");
      const creatorBalBefore = await zeroDAOTokenV2.balanceOf(creator.address);
      const user3BalBefore = await zeroDAOTokenV2.balanceOf(user3.address);
      const allowanceBefore = await zeroDAOTokenV2.allowance(creator.address, user2.address);

      await zeroDAOTokenV2.connect(user2).transferFrom(creator.address, user3.address, tfAmt);

      expect(await zeroDAOTokenV2.balanceOf(creator.address)).to.eq(creatorBalBefore.sub(tfAmt));
      expect(await zeroDAOTokenV2.balanceOf(user3.address)).to.eq(user3BalBefore.add(tfAmt));
      expect(await zeroDAOTokenV2.allowance(creator.address, user2.address)).to.eq(allowanceBefore.sub(tfAmt));
    });

    it("snapshot authorization and events work", async () => {
      // Owner can snapshot
      const nextId = await zeroDAOTokenV2.connect(creator).callStatic.snapshot();
      await expect(zeroDAOTokenV2.connect(creator).snapshot()).to.not.be.reverted;
      const expectedNext = nextId.add(1);
      expect(await zeroDAOTokenV2.connect(creator).callStatic.snapshot()).to.eq(expectedNext);

      // Non-owner unauthorized by default
      await expect(zeroDAOTokenV2.connect(user1).snapshot()).to.be.revertedWith("zDAOToken: Not authorized to snapshot");

      // Authorize user1
      await expect(zeroDAOTokenV2.connect(creator).authorizeSnapshotter(user1.address))
        .to.emit(zeroDAOTokenV2, "AuthorizedSnapshotter")
        .withArgs(user1.address);

      // Now user1 can snapshot
      await expect(zeroDAOTokenV2.connect(user1).snapshot()).to.not.be.reverted;

      // Deauthorize and ensure it reverts again
      await expect(zeroDAOTokenV2.connect(creator).deauthorizeSnapshotter(user1.address))
        .to.emit(zeroDAOTokenV2, "DeauthorizedSnapshotter")
        .withArgs(user1.address);

      await expect(zeroDAOTokenV2.connect(user1).snapshot()).to.be.revertedWith("zDAOToken: Not authorized to snapshot");
    });

    it("pause/unpause gates token operations", async () => {
      await zeroDAOTokenV2.connect(creator).pause();

      await expect(
        zeroDAOTokenV2.connect(creator).transfer(user1.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      await expect(
        zeroDAOTokenV2.connect(creator).mint(creator.address, ethers.utils.parseEther("1"))
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      await zeroDAOTokenV2.connect(creator).unpause();

      await expect(
        zeroDAOTokenV2.connect(creator).transfer(user1.address, ethers.utils.parseEther("1"))
      ).to.not.be.reverted;
    });

    it("transferBulk distributes to multiple recipients and validates inputs", async () => {
      const recipients = [user2.address, user3.address];
      const per = ethers.utils.parseEther("5");
      const total = per.mul(recipients.length);

      // Ensure creator has enough funds for this test
      const creatorBal = await zeroDAOTokenV2.balanceOf(creator.address);
      if (creatorBal.lt(total)) {
        await zeroDAOTokenV2.connect(creator).mint(creator.address, total.sub(creatorBal));
      }

      const creatorBefore = await zeroDAOTokenV2.balanceOf(creator.address);
      const user2Before = await zeroDAOTokenV2.balanceOf(user2.address);
      const user3Before = await zeroDAOTokenV2.balanceOf(user3.address);

      await zeroDAOTokenV2.connect(creator).transferBulk(recipients, per);

      expect(await zeroDAOTokenV2.balanceOf(creator.address)).to.eq(creatorBefore.sub(total));
      expect(await zeroDAOTokenV2.balanceOf(user2.address)).to.eq(user2Before.add(per));
      expect(await zeroDAOTokenV2.balanceOf(user3.address)).to.eq(user3Before.add(per));

      // Zero address recipient should revert
      await expect(
        zeroDAOTokenV2.connect(creator).transferBulk([ethers.constants.AddressZero], per)
      ).to.be.revertedWith("ERC20: transfer to the zero address");

      // Insufficient balance should revert
      const tooBig = ethers.utils.parseEther("1000000000");
      await expect(
        zeroDAOTokenV2.connect(user1).transferBulk([user2.address], tooBig)
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("transferFromBulk uses allowance and updates balances and allowance", async () => {
      const recipients = [user2.address, user3.address, user1.address];
      const per = ethers.utils.parseEther("2");
      const total = per.mul(recipients.length);

      // Ensure creator has enough and approve user1 to spend
      const creatorBal = await zeroDAOTokenV2.balanceOf(creator.address);
      if (creatorBal.lt(total)) {
        await zeroDAOTokenV2.connect(creator).mint(creator.address, total.sub(creatorBal));
      }

      await expect(
        zeroDAOTokenV2.connect(user1).transferFromBulk(creator.address, recipients, per)
      ).to.be.revertedWith("ERC20: transfer total exceeds allowance");

      await zeroDAOTokenV2.connect(creator).approve(user1.address, total);

      const creatorBefore = await zeroDAOTokenV2.balanceOf(creator.address);
      const allowancesBefore = await zeroDAOTokenV2.allowance(creator.address, user1.address);
      const user1Before = await zeroDAOTokenV2.balanceOf(user1.address);
      const user2Before = await zeroDAOTokenV2.balanceOf(user2.address);
      const user3Before = await zeroDAOTokenV2.balanceOf(user3.address);

      await zeroDAOTokenV2.connect(user1).transferFromBulk(creator.address, recipients, per);

      expect(await zeroDAOTokenV2.balanceOf(creator.address)).to.eq(creatorBefore.sub(total));
      expect(await zeroDAOTokenV2.balanceOf(user1.address)).to.eq(user1Before.add(per));
      expect(await zeroDAOTokenV2.balanceOf(user2.address)).to.eq(user2Before.add(per));
      expect(await zeroDAOTokenV2.balanceOf(user3.address)).to.eq(user3Before.add(per));
      expect(await zeroDAOTokenV2.allowance(creator.address, user1.address)).to.eq(allowancesBefore.sub(total));
    });

    it("owner burn reduces holder balance and total supply", async () => {
      // Ensure user1 has enough to burn
      const burnAmt = ethers.utils.parseEther("10");
      const user1Bal = await zeroDAOTokenV2.balanceOf(user1.address);
      if (user1Bal.lt(burnAmt)) {
        await zeroDAOTokenV2.connect(creator).mint(user1.address, burnAmt.sub(user1Bal));
      }

      await expect(zeroDAOTokenV2.connect(user1).burn(user1.address, burnAmt)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );

      const user1Before = await zeroDAOTokenV2.balanceOf(user1.address);
      const supplyBefore = await zeroDAOTokenV2.totalSupply();

      await zeroDAOTokenV2.connect(creator).burn(user1.address, burnAmt);

      expect(await zeroDAOTokenV2.balanceOf(user1.address)).to.eq(user1Before.sub(burnAmt));
      expect(await zeroDAOTokenV2.totalSupply()).to.eq(supplyBefore.sub(burnAmt));
    });
  });
});
