import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ZeroDAOTokenV2__factory,
  ZeroDAOTokenV2,
  ZeroDAOTokenV3__factory,
  ZeroDAOTokenV3,
} from "../typechain";
import {
  DEFAULT_V3_TOKEN_NAME,
  DEFAULT_V3_TOKEN_SYMBOL,
  DEFAULT_V3_DECIMALS,
  DEFAULT_V3_INITIAL_MINT_AMOUNT,
  DEFAULT_V3_INITIAL_SUPPLY,
  DEFAULT_V3_ABI_TEST_AMOUNT,
  DEFAULT_V3_ABI_BURN_AMOUNT,
  DEFAULT_V3_BURN_TRANSFER_AMOUNT,
  DEFAULT_V3_NORMAL_TRANSFER_AMOUNT,
  DEFAULT_V3_BULK_TRANSFER_AMOUNT,
  DEFAULT_V3_BULK_TRANSFERFROM_AMOUNT,
} from "./helpers/constants";

import * as hre from "hardhat";

describe("zDAOTokenV3 Unit Tests", () => {
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let tokenV2: ZeroDAOTokenV2;
  let tokenV3: ZeroDAOTokenV3;

  // Use constants for testing
  const initialMintAmount = ethers.utils.parseUnits(
    DEFAULT_V3_INITIAL_MINT_AMOUNT,
    DEFAULT_V3_DECIMALS
  );

  before(async () => {
    [creator, user1, user2, user3] = await hre.ethers.getSigners();
  });

  describe("ZeroDAOTokenV3 Core Functionality", () => {
    it("should deploy ZeroDAOTokenV2 and mint tokens to users", async () => {
      // Deploy ZeroDAOTokenV2 first
      tokenV2 = (await hre.upgrades.deployProxy(
        new ZeroDAOTokenV2__factory(creator),
        [DEFAULT_V3_TOKEN_NAME, DEFAULT_V3_TOKEN_SYMBOL]
      )) as ZeroDAOTokenV2;

      await tokenV2.deployed();

      // Verify deployment
      expect(await tokenV2.name()).to.equal(DEFAULT_V3_TOKEN_NAME);
      expect(await tokenV2.symbol()).to.equal(DEFAULT_V3_TOKEN_SYMBOL);
      expect(await tokenV2.owner()).to.equal(creator.address);

      // Mint tokens to users for testing
      const mintAmount = ethers.utils.parseEther("10000"); // 10,000 tokens per user
      await tokenV2.connect(creator).mint(user1.address, mintAmount);
      await tokenV2.connect(creator).mint(user2.address, mintAmount);
      await tokenV2.connect(creator).mint(user3.address, mintAmount);

      // Verify balances
      expect(await tokenV2.balanceOf(user1.address)).to.equal(mintAmount);
      expect(await tokenV2.balanceOf(user2.address)).to.equal(mintAmount);
      expect(await tokenV2.balanceOf(user3.address)).to.equal(mintAmount);
    });

    it("should upgrade from V2 to V3", async () => {
      // Store pre-upgrade state
      const preUpgradeName = await tokenV2.name();
      const preUpgradeSymbol = await tokenV2.symbol();
      const preUpgradeOwner = await tokenV2.owner();
      const preUpgradeTotalSupply = await tokenV2.totalSupply();
      const preUpgradeUser1Balance = await tokenV2.balanceOf(user1.address);
      const preUpgradeUser2Balance = await tokenV2.balanceOf(user2.address);
      const preUpgradeUser3Balance = await tokenV2.balanceOf(user3.address);

      // Perform the upgrade
      tokenV3 = (await hre.upgrades.upgradeProxy(
        tokenV2.address,
        new ZeroDAOTokenV3__factory(creator)
      )) as ZeroDAOTokenV3;

      expect(tokenV3.address).to.equal(tokenV2.address);

      // Verify state variables are preserved
      expect(await tokenV3.name()).to.equal(preUpgradeName);
      expect(await tokenV3.symbol()).to.equal(preUpgradeSymbol);
      expect(await tokenV3.owner()).to.equal(preUpgradeOwner);
      expect(await tokenV3.totalSupply()).to.equal(preUpgradeTotalSupply);
      expect(await tokenV3.balanceOf(user1.address)).to.equal(
        preUpgradeUser1Balance
      );
      expect(await tokenV3.balanceOf(user2.address)).to.equal(
        preUpgradeUser2Balance
      );
      expect(await tokenV3.balanceOf(user3.address)).to.equal(
        preUpgradeUser3Balance
      );
    });

    it("should confirm onlyOwner functions are not present", async () => {
      // Check that onlyOwner functions are not accessible in V3
      expect((tokenV3 as any).mint).to.be.undefined;
      expect((tokenV3 as any).burn).to.be.undefined;
      expect((tokenV3 as any).pause).to.be.undefined;
      expect((tokenV3 as any).unpause).to.be.undefined;
      expect((tokenV3 as any).snapshot).to.be.undefined;
      expect((tokenV3 as any).authorizeSnapshotter).to.be.undefined;
      expect((tokenV3 as any).deauthorizeSnapshotter).to.be.undefined;
      expect((tokenV3 as any).withdrawERC20).to.be.undefined;

      // Verify that remaining functions still exist
      expect(tokenV3.transferBulk).to.be.a("function");
      expect(tokenV3.transferFromBulk).to.be.a("function");
      expect(tokenV3.transfer).to.be.a("function");
      expect(tokenV3.balanceOf).to.be.a("function");
    });

    it("should confirm removed functions cannot be called with direct ABI manipulation", async () => {
      // Test mint function selector
      const mintSelector = "0x40c10f19"; // mint(address,uint256)
      const mintAmount = ethers.utils.parseEther(DEFAULT_V3_ABI_TEST_AMOUNT);
      const mintCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user3.address, mintAmount]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: mintSelector + mintCalldata.slice(2),
        })
      ).to.be.reverted;

      // Test burn function selector
      const burnSelector = "0x9dc29fac"; // burn(address,uint256)
      const burnCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user1.address, ethers.utils.parseEther(DEFAULT_V3_ABI_BURN_AMOUNT)]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: burnSelector + burnCalldata.slice(2),
        })
      ).to.be.reverted;

      // Test pause function selector
      const pauseSelector = "0x8456cb59"; // pause()
      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: pauseSelector,
        })
      ).to.be.reverted;

      // Test snapshot function selector
      const snapshotSelector = "0x9711715a"; // snapshot() function selector
      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: snapshotSelector,
        })
      ).to.be.reverted;
    });

    it("should test burn-on-self-transfer functionality", async () => {
      // Test burn-on-self-transfer with user1 who has tokens from the upgrade
      const transferAmount = ethers.utils.parseEther(
        DEFAULT_V3_BURN_TRANSFER_AMOUNT
      );
      const user1Balance = await tokenV3.balanceOf(user1.address);
      const initialTotalSupply = await tokenV3.totalSupply();

      // Ensure user1 has enough tokens for the test
      expect(user1Balance).to.be.gte(transferAmount);

      // Transfer to self (contract address) should burn tokens
      const tx = await tokenV3
        .connect(user1)
        .transfer(tokenV3.address, transferAmount);

      // Should emit Transfer to contract and then Transfer from contract to zero (burn)
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, tokenV3.address, transferAmount);
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(
          tokenV3.address,
          ethers.constants.AddressZero,
          transferAmount
        );

      // Verify tokens were burned
      expect(await tokenV3.balanceOf(user1.address)).to.equal(
        user1Balance.sub(transferAmount)
      );
      expect(await tokenV3.balanceOf(tokenV3.address)).to.equal(0); // Contract should have 0 balance
      expect(await tokenV3.totalSupply()).to.equal(
        initialTotalSupply.sub(transferAmount)
      );
    });

    it("should test normal transfers work correctly", async () => {
      // Test that normal transfers between users work without burning
      const transferAmount = ethers.utils.parseEther(
        DEFAULT_V3_NORMAL_TRANSFER_AMOUNT
      );
      const user1Balance = await tokenV3.balanceOf(user1.address);
      const user2Balance = await tokenV3.balanceOf(user2.address);
      const initialTotalSupply = await tokenV3.totalSupply();

      // Ensure user1 has enough tokens for the test
      expect(user1Balance).to.be.gte(transferAmount);

      const tx = await tokenV3
        .connect(user1)
        .transfer(user2.address, transferAmount);

      // Should only emit one Transfer event (no burn)
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      // Verify balances changed correctly
      expect(await tokenV3.balanceOf(user1.address)).to.equal(
        user1Balance.sub(transferAmount)
      );
      expect(await tokenV3.balanceOf(user2.address)).to.equal(
        user2Balance.add(transferAmount)
      );
      expect(await tokenV3.totalSupply()).to.equal(initialTotalSupply); // No change in total supply
    });

    it("should test bulk transfer functions", async () => {
      const transferAmount = ethers.utils.parseEther(
        DEFAULT_V3_BULK_TRANSFER_AMOUNT
      );
      const recipients = [user2.address, user3.address];
      const totalAmount = transferAmount.mul(recipients.length);
      const user1Balance = await tokenV3.balanceOf(user1.address);

      // Ensure user1 has enough tokens for the test
      expect(user1Balance).to.be.gte(totalAmount);

      const initialUser2Balance = await tokenV3.balanceOf(user2.address);
      const initialUser3Balance = await tokenV3.balanceOf(user3.address);

      const tx = await tokenV3
        .connect(user1)
        .transferBulk(recipients, transferAmount);

      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user3.address, transferAmount);

      // Verify balances
      expect(await tokenV3.balanceOf(user1.address)).to.equal(
        user1Balance.sub(totalAmount)
      );
      expect(await tokenV3.balanceOf(user2.address)).to.equal(
        initialUser2Balance.add(transferAmount)
      );
      expect(await tokenV3.balanceOf(user3.address)).to.equal(
        initialUser3Balance.add(transferAmount)
      );
    });

    it("should test bulk transferFrom functions", async () => {
      const transferAmount = ethers.utils.parseEther(
        DEFAULT_V3_BULK_TRANSFERFROM_AMOUNT
      );
      const recipients = [user2.address, user3.address];
      const totalAmount = transferAmount.mul(recipients.length);
      const user1Balance = await tokenV3.balanceOf(user1.address);

      // Ensure user1 has enough tokens for the test
      expect(user1Balance).to.be.gte(totalAmount);

      // First approve creator to spend from user1
      await tokenV3.connect(user1).approve(creator.address, totalAmount);

      const initialUser1Balance = await tokenV3.balanceOf(user1.address);
      const initialUser2Balance = await tokenV3.balanceOf(user2.address);
      const initialUser3Balance = await tokenV3.balanceOf(user3.address);

      const tx = await tokenV3
        .connect(creator)
        .transferFromBulk(user1.address, recipients, transferAmount);

      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user3.address, transferAmount);

      // Verify balances
      expect(await tokenV3.balanceOf(user1.address)).to.equal(
        initialUser1Balance.sub(totalAmount)
      );
      expect(await tokenV3.balanceOf(user2.address)).to.equal(
        initialUser2Balance.add(transferAmount)
      );
      expect(await tokenV3.balanceOf(user3.address)).to.equal(
        initialUser3Balance.add(transferAmount)
      );
    });

    it("confirms contract state", async () => {
      // Verify that the contract owner exists for storage compatibility
      // but has no special privileges
      expect(await tokenV3.owner()).to.equal(creator.address);

      // Verify that all privileged functions have been removed
      // This has been tested in previous test cases

      // The only way to interact with the contract now is through:
      // 1. Standard ERC20 functions (transfer, approve, etc.)
      // 2. Bulk transfer functions
      // 3. Burn-on-self-transfer functionality

      // Verify the contract still functions as a basic ERC20
      expect(await tokenV3.name()).to.equal(DEFAULT_V3_TOKEN_NAME);
      expect(await tokenV3.symbol()).to.equal(DEFAULT_V3_TOKEN_SYMBOL);
      expect(await tokenV3.totalSupply()).to.be.gt(0);
    });
  });
});
