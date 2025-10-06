import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ERC20Mock,
  ERC20Mock__factory,
  ZeroDAOTokenV2__factory,
  ZeroDAOTokenV2,
} from "../typechain";
import {
  DEFAULT_V2_TOKEN_NAME,
  DEFAULT_V2_TOKEN_SYMBOL,
  DEFAULT_TEST_MOCK_TOKEN_NAME,
  DEFAULT_TEST_MOCK_TOKEN_SYMBOL,
  DEFAULT_MOCK_TOKEN_AMOUNT,
  DEFAULT_MOCK_TOKEN_DECIMALS,
  DEFAULT_V2_ADDITIONAL_AMOUNT,
  DEFAULT_V2_TEST_AMOUNT,
  DEFAULT_V2_INSUFFICIENT_AMOUNT,
  DEFAULT_V2_MINT_AMOUNT,
  DEFAULT_V2_BURN_AMOUNT,
  DEFAULT_V2_PAUSE_TRANSFER_AMOUNT,
  DEFAULT_V2_BULK_TRANSFER_AMOUNT,
  DEFAULT_V2_BULK_TRANSFERFROM_AMOUNT,
} from "./helpers/constants";

import * as hre from "hardhat";

describe("zDAOTokenV2 Unit Tests", () => {
  let creator: SignerWithAddress;
  let owner: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let tokenV2: ZeroDAOTokenV2;
  let mockToken: ERC20Mock;

  // Use constants for testing
  const testTokenAmount = ethers.utils.parseUnits(
    DEFAULT_MOCK_TOKEN_AMOUNT,
    DEFAULT_MOCK_TOKEN_DECIMALS
  );

  before(async () => {
    [creator, owner, user1, user2] = await ethers.getSigners();
  });

  describe("ZeroDAOTokenV2 Core Functionality", () => {
    it("should deploy ZeroDAOTokenV2 contract", async () => {
      // Deploy ZeroDAOTokenV2
      tokenV2 = (await hre.upgrades.deployProxy(
        new ZeroDAOTokenV2__factory(creator),
        [DEFAULT_V2_TOKEN_NAME, DEFAULT_V2_TOKEN_SYMBOL]
      )) as ZeroDAOTokenV2;

      await tokenV2.deployed();

      // Verify deployment
      expect(await tokenV2.name()).to.equal(DEFAULT_V2_TOKEN_NAME);
      expect(await tokenV2.symbol()).to.equal(DEFAULT_V2_TOKEN_SYMBOL);
      expect(await tokenV2.owner()).to.equal(creator.address);

      // Deploy mock token for testing withdrawERC20
      const mockTokenFactory = new ERC20Mock__factory(creator);
      mockToken = await mockTokenFactory.deploy(
        DEFAULT_TEST_MOCK_TOKEN_NAME,
        DEFAULT_TEST_MOCK_TOKEN_SYMBOL
      );
      await mockToken.deployed();

      await mockToken.mint(tokenV2.address, testTokenAmount);
      expect(await mockToken.balanceOf(tokenV2.address)).to.eq(testTokenAmount);
    });

    it("should test withdrawERC20 function with specific amount", async () => {
      const initialRecipientBalance = await mockToken.balanceOf(user1.address);
      const initialContractBalance = await mockToken.balanceOf(tokenV2.address);

      // Call withdrawERC20 function
      const tx = await tokenV2
        .connect(creator)
        .withdrawERC20(mockToken.address, user1.address, testTokenAmount);

      // Verify the transaction emitted the correct event
      await expect(tx)
        .to.emit(tokenV2, "ERC20TokenWithdrawn")
        .withArgs(mockToken.address, user1.address, testTokenAmount);

      // Check contract balance (should be 0)
      const finalContractBalance = await mockToken.balanceOf(tokenV2.address);
      expect(finalContractBalance).to.eq(
        initialContractBalance.sub(testTokenAmount)
      );

      // Check recipient balance (should have received the tokens)
      const finalRecipientBalance = await mockToken.balanceOf(user1.address);
      expect(finalRecipientBalance).to.eq(
        initialRecipientBalance.add(testTokenAmount)
      );
    });

    it("should test withdrawERC20 with amount 0 (withdraw all)", async () => {
      // First, give the contract some more tokens
      const additionalAmount = ethers.utils.parseUnits(
        DEFAULT_V2_ADDITIONAL_AMOUNT,
        DEFAULT_MOCK_TOKEN_DECIMALS
      );
      await mockToken.connect(creator).mint(tokenV2.address, additionalAmount);

      const initialRecipientBalance = await mockToken.balanceOf(user2.address);

      // Call withdrawERC20 with amount 0 (should withdraw all)
      const tx = await tokenV2.connect(creator).withdrawERC20(
        mockToken.address,
        user2.address,
        0 // This should withdraw total contract balance of `token` given
      );

      // Verify the transaction emitted the correct event with the full amount
      await expect(tx)
        .to.emit(tokenV2, "ERC20TokenWithdrawn")
        .withArgs(mockToken.address, user2.address, additionalAmount);

      // Check final balances
      const finalContractBalance = await mockToken.balanceOf(tokenV2.address);
      const finalRecipientBalance = await mockToken.balanceOf(user2.address);

      expect(finalContractBalance).to.eq(0);
      expect(finalRecipientBalance).to.eq(
        initialRecipientBalance.add(additionalAmount)
      );
    });

    it("should fail when called by non-owner", async () => {
      // Give the contract some tokens first
      const testAmount = ethers.utils.parseUnits(
        DEFAULT_V2_TEST_AMOUNT,
        DEFAULT_MOCK_TOKEN_DECIMALS
      );
      await mockToken.connect(creator).mint(tokenV2.address, testAmount);

      // Try to call withdrawERC20 from non-owner account
      await expect(
        tokenV2
          .connect(user1)
          .withdrawERC20(mockToken.address, user1.address, testAmount)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("should fail when token or recipient address is zero", async () => {
      const testAmount = ethers.utils.parseUnits(
        DEFAULT_V2_TEST_AMOUNT,
        DEFAULT_MOCK_TOKEN_DECIMALS
      );

      // Test zero token address
      await expect(
        tokenV2
          .connect(creator)
          .withdrawERC20(
            ethers.constants.AddressZero,
            user1.address,
            testAmount
          )
      ).to.be.revertedWith("zDAOToken: Token address cannot be zero");

      // Test zero recipient address
      await expect(
        tokenV2
          .connect(creator)
          .withdrawERC20(
            mockToken.address,
            ethers.constants.AddressZero,
            testAmount
          )
      ).to.be.revertedWith("zDAOToken: Recipient address cannot be zero");
    });

    it("should fail when contract has insufficient token balance", async () => {
      // Test insufficient balance
      await expect(
        tokenV2
          .connect(creator)
          .withdrawERC20(
            mockToken.address,
            user1.address,
            ethers.utils.parseUnits(
              DEFAULT_V2_INSUFFICIENT_AMOUNT,
              DEFAULT_MOCK_TOKEN_DECIMALS
            )
          )
      ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
    });

    it("should allow owner to mint tokens", async () => {
      const mintAmount = ethers.utils.parseEther(DEFAULT_V2_MINT_AMOUNT);
      const initialBalance = await tokenV2.balanceOf(user1.address);
      const initialSupply = await tokenV2.totalSupply();

      await tokenV2.connect(creator).mint(user1.address, mintAmount);

      expect(await tokenV2.balanceOf(user1.address)).to.eq(
        initialBalance.add(mintAmount)
      );
      expect(await tokenV2.totalSupply()).to.eq(initialSupply.add(mintAmount));
    });

    it("should allow owner to burn tokens", async () => {
      const burnAmount = ethers.utils.parseEther(DEFAULT_V2_BURN_AMOUNT);
      const initialBalance = await tokenV2.balanceOf(user1.address);
      const initialSupply = await tokenV2.totalSupply();

      await tokenV2.connect(creator).burn(user1.address, burnAmount);

      expect(await tokenV2.balanceOf(user1.address)).to.eq(
        initialBalance.sub(burnAmount)
      );
      expect(await tokenV2.totalSupply()).to.eq(initialSupply.sub(burnAmount));
    });

    it("should allow owner to pause and unpause", async () => {
      // Pause the contract
      await tokenV2.connect(creator).pause();

      // Transfers should fail when paused
      await expect(
        tokenV2
          .connect(user1)
          .transfer(
            user2.address,
            ethers.utils.parseEther(DEFAULT_V2_PAUSE_TRANSFER_AMOUNT)
          )
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      // Unpause the contract
      await tokenV2.connect(creator).unpause();

      // Transfers should work when unpaused
      await expect(
        tokenV2
          .connect(user1)
          .transfer(
            user2.address,
            ethers.utils.parseEther(DEFAULT_V2_PAUSE_TRANSFER_AMOUNT)
          )
      ).to.not.be.reverted;
    });

    it("should handle snapshot functionality", async () => {
      // Owner can snapshot
      const snapshotId = await tokenV2.connect(creator).callStatic.snapshot();
      await tokenV2.connect(creator).snapshot();

      // Authorize user1 to take snapshots
      await expect(tokenV2.connect(creator).authorizeSnapshotter(user1.address))
        .to.emit(tokenV2, "AuthorizedSnapshotter")
        .withArgs(user1.address);

      // User1 can now snapshot
      await expect(tokenV2.connect(user1).snapshot()).to.not.be.reverted;

      // Deauthorize user1
      await expect(
        tokenV2.connect(creator).deauthorizeSnapshotter(user1.address)
      )
        .to.emit(tokenV2, "DeauthorizedSnapshotter")
        .withArgs(user1.address);

      // User1 can no longer snapshot
      await expect(tokenV2.connect(user1).snapshot()).to.be.revertedWith(
        "zDAOToken: Not authorized to snapshot"
      );
    });

    it("should handle bulk transfers", async () => {
      const transferAmount = ethers.utils.parseEther(
        DEFAULT_V2_BULK_TRANSFER_AMOUNT
      );
      const recipients = [user1.address, user2.address];

      // Ensure creator has enough tokens
      await tokenV2
        .connect(creator)
        .mint(creator.address, transferAmount.mul(recipients.length));

      const initialCreatorBalance = await tokenV2.balanceOf(creator.address);
      const initialUser1Balance = await tokenV2.balanceOf(user1.address);
      const initialUser2Balance = await tokenV2.balanceOf(user2.address);

      await tokenV2.connect(creator).transferBulk(recipients, transferAmount);

      expect(await tokenV2.balanceOf(creator.address)).to.eq(
        initialCreatorBalance.sub(transferAmount.mul(recipients.length))
      );
      expect(await tokenV2.balanceOf(user1.address)).to.eq(
        initialUser1Balance.add(transferAmount)
      );
      expect(await tokenV2.balanceOf(user2.address)).to.eq(
        initialUser2Balance.add(transferAmount)
      );
    });

    it("should handle bulk transferFrom", async () => {
      const transferAmount = ethers.utils.parseEther(
        DEFAULT_V2_BULK_TRANSFERFROM_AMOUNT
      );
      const recipients = [user1.address, user2.address];
      const totalAmount = transferAmount.mul(recipients.length);

      // Ensure creator has enough tokens and approve user1
      await tokenV2.connect(creator).mint(creator.address, totalAmount);
      await tokenV2.connect(creator).approve(user1.address, totalAmount);

      const initialCreatorBalance = await tokenV2.balanceOf(creator.address);
      const initialUser1Balance = await tokenV2.balanceOf(user1.address);
      const initialUser2Balance = await tokenV2.balanceOf(user2.address);

      await tokenV2
        .connect(user1)
        .transferFromBulk(creator.address, recipients, transferAmount);

      expect(await tokenV2.balanceOf(creator.address)).to.eq(
        initialCreatorBalance.sub(totalAmount)
      );
      expect(await tokenV2.balanceOf(user1.address)).to.eq(
        initialUser1Balance.add(transferAmount)
      );
      expect(await tokenV2.balanceOf(user2.address)).to.eq(
        initialUser2Balance.add(transferAmount)
      );
    });
  });
});
