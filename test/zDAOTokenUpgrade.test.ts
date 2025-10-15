import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";
import {
  ZeroDAOToken,
  ZeroDAOTokenV2,
  ZeroDAOTokenV2__factory,
  ERC20Mock__factory,
  ERC20Mock,
} from "../typechain";
import { deployFundTransfer } from "./helpers/deploy-fund-transfer";
import { deployV2 } from "./helpers/deploy-v2";
import { readState } from "./helpers/read-state";
import { readCompareState } from "./helpers/read-compare-state";
import { ContractStorageData } from "../scripts/utils/storage-check";
import {
  DEFAULT_ZERO_TOKEN_NAME,
  DEFAULT_ZERO_TOKEN_SYMBOL,
  DEFAULT_TEST_MOCK_TOKEN_NAME,
  DEFAULT_TEST_MOCK_TOKEN_SYMBOL,
  DEFAULT_TEST_MINT_AMOUNT,
  DEFAULT_MOCK_TOKEN_DECIMALS,
  DEFAULT_WITHDRAW_AMOUNT,
  DEFAULT_TOKEN_MINT_AMOUNT,
  DEFAULT_TRANSFER_AMOUNT
} from "./helpers/constants";

describe("zDAO Token Upgrade", () => {
  let creator: SignerWithAddress;
  let userA: SignerWithAddress;
  let userB: SignerWithAddress;

  let tokenV1: ZeroDAOToken;
  let tokenV2: ZeroDAOTokenV2;
  let mockToken: ERC20Mock;
  let preUpgradeState: ContractStorageData;

  before(async () => {
    [creator, userA, userB] = await hre.ethers.getSigners();
  });

  describe("Token Upgrade Flow", () => {
    it("should deploy and fund V1 token with mock ERC20", async () => {
      // Call deploy-fund-transfer helper
      tokenV1 = await deployFundTransfer(creator, creator.address);

      expect(tokenV1.address).to.not.be.undefined;
      expect(await tokenV1.name()).to.equal(DEFAULT_ZERO_TOKEN_NAME);
      expect(await tokenV1.symbol()).to.equal(DEFAULT_ZERO_TOKEN_SYMBOL);

      // The deployFundTransfer helper already creates and funds a mock token
      // We need to find that mock token address from the deployment
      // For now, let's create our own mock token for testing the withdrawERC20 function
      const mockTokenFactory = new ERC20Mock__factory(creator);
      mockToken = await mockTokenFactory.deploy(DEFAULT_TEST_MOCK_TOKEN_NAME, DEFAULT_TEST_MOCK_TOKEN_SYMBOL);

      // Mint some mock tokens to the V1 contract for testing withdrawERC20
      const mintAmount = ethers.utils.parseUnits(DEFAULT_TEST_MINT_AMOUNT, DEFAULT_MOCK_TOKEN_DECIMALS);
      await mockToken.mint(tokenV1.address, mintAmount);

      // Fund users for later when public `mint` and `burn` functions are removed
      await tokenV1.mint(userA.address, mintAmount);
      await tokenV1.mint(userB.address, mintAmount);

      const balance = await mockToken.balanceOf(tokenV1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("should upgrade from V1 to V2", async () => {
      // Call readState helper to get state before upgrading
      preUpgradeState = await readState(creator, tokenV1.address);

      // Get the proxy admin and its owner
      const proxyAdmin = await hre.upgrades.admin.getInstance();
      const proxyAdminOwner = await proxyAdmin.owner();

      // Get the signer for the proxy admin owner
      let upgrader: SignerWithAddress;
      const accounts = await hre.ethers.getSigners();

      // Find the account that matches the proxy admin owner
      upgrader = accounts.find(account => account.address.toLowerCase() === proxyAdminOwner.toLowerCase()) || creator;

      // Upgrade from v1 to v2 using
      const tokenV2Factory = new ZeroDAOTokenV2__factory(upgrader);

      tokenV2 = await hre.upgrades.upgradeProxy(
        tokenV1.address,
        tokenV2Factory
      ) as ZeroDAOTokenV2;

      expect(tokenV2.address).to.equal(tokenV1.address); // Same proxy address
    });

    it("should read and compare state after upgrade", async () => {
      // Call readStateAndCompare helper to compare states
      // This function throws internally if there is a discrepency between
      // the pre and post upgrade states. By not throwing, we know it passes.
      await readCompareState(creator, tokenV2.address, preUpgradeState);
    });

    it("should test withdrawERC20 function and verify balances", async () => {
      // Check initial balance of the contract
      const contractBalanceBefore = await mockToken.balanceOf(tokenV2.address);

      // Check initial balance of recipient (creator)
      const creatorBalance = await mockToken.balanceOf(creator.address);

      // Define withdrawal amount
      const withdrawAmount = ethers.utils.parseUnits(DEFAULT_WITHDRAW_AMOUNT, DEFAULT_MOCK_TOKEN_DECIMALS);
      expect(withdrawAmount).to.be.lte(contractBalanceBefore);

      // Call withdrawERC20 function as the token owner
      const tx = await tokenV2.connect(creator).withdrawERC20(
        mockToken.address,
        creator.address,
        withdrawAmount
      );

      // Verify the transaction was successful
      await tx.wait();

      // Check balances after withdrawal
      const contractBalanceFinal = await mockToken.balanceOf(tokenV2.address);
      const creatorBalanceFinal = await mockToken.balanceOf(creator.address);

      // Verify the contract balance decreased by the withdrawal amount
      expect(contractBalanceFinal).to.equal(contractBalanceBefore.sub(withdrawAmount));

      // Verify the recipient balance increased by the withdrawal amount
      expect(creatorBalanceFinal).to.equal(creatorBalance.add(withdrawAmount));
    });

    it("should verify token functionality is preserved after upgrade", async () => {
      // Verify basic token properties are preserved
      expect(await tokenV2.name()).to.equal(DEFAULT_ZERO_TOKEN_NAME);
      expect(await tokenV2.symbol()).to.equal(DEFAULT_ZERO_TOKEN_SYMBOL);
      expect(await tokenV2.owner()).to.equal(creator.address);

      // Check balances - userA and userB should have tokens from the pre-upgrade minting
      const creatorBalance = await tokenV2.balanceOf(creator.address);
      const userABalance = await tokenV2.balanceOf(userA.address);
      const userBBalance = await tokenV2.balanceOf(userB.address);

      // Verify that userA and userB have the expected token balances from pre-upgrade minting
      const expectedMintAmount = ethers.utils.parseUnits(DEFAULT_TEST_MINT_AMOUNT, DEFAULT_MOCK_TOKEN_DECIMALS);
      expect(userABalance).to.equal(expectedMintAmount);
      expect(userBBalance).to.equal(expectedMintAmount);

      // Test basic transfer functionality using userA's tokens
      const transferAmount = ethers.utils.parseUnits(DEFAULT_TRANSFER_AMOUNT, 18);
      const initialUserABalance = await tokenV2.balanceOf(userA.address);
      const initialCreatorBalance = await tokenV2.balanceOf(creator.address);

      // Transfer from userA to creator
      await tokenV2.connect(userA).transfer(creator.address, transferAmount);

      // Verify balances updated correctly
      expect(await tokenV2.balanceOf(userA.address)).to.equal(initialUserABalance.sub(transferAmount));
      expect(await tokenV2.balanceOf(creator.address)).to.equal(initialCreatorBalance.add(transferAmount));

      // Test snapshot functionality
      const snapshotTx = await tokenV2.connect(creator).snapshot();
      await expect(snapshotTx).to.emit(tokenV2, "Snapshot");

      // Verify snapshot captured the current balances
      const userABalanceAtSnapshot = await tokenV2.balanceOf(userA.address);
      const snapshotId = 1; // First snapshot
      const userASnapshotBalance = await tokenV2.balanceOfAt(userA.address, snapshotId);
      expect(userASnapshotBalance).to.equal(userABalanceAtSnapshot);

      // Test snapshotter authorization functionality
      await expect(tokenV2.connect(userA).snapshot()).to.be.revertedWith(
        "zDAOToken: Not authorized to snapshot"
      );

      // Authorize userA to snapshot
      const authTx = await tokenV2.connect(creator).authorizeSnapshotter(userA.address);
      await expect(authTx).to.emit(tokenV2, "AuthorizedSnapshotter").withArgs(userA.address);

      // Now userA should be able to snapshot
      const userASnapshotTx = await tokenV2.connect(userA).snapshot();
      await expect(userASnapshotTx).to.emit(tokenV2, "Snapshot");

      // Deauthorize userA
      const deauthTx = await tokenV2.connect(creator).deauthorizeSnapshotter(userA.address);
      await expect(deauthTx).to.emit(tokenV2, "DeauthorizedSnapshotter").withArgs(userA.address);

      // userA should no longer be able to snapshot
      await expect(tokenV2.connect(userA).snapshot()).to.be.revertedWith(
        "zDAOToken: Not authorized to snapshot"
      );

      // Test pause/unpause functionality
      const pauseTx = await tokenV2.connect(creator).pause();
      await expect(pauseTx).to.emit(tokenV2, "Paused");

      // Transfers should be blocked when paused - test with userB's tokens
      await expect(
        tokenV2.connect(userB).transfer(creator.address, transferAmount)
      ).to.be.revertedWith("ERC20Pausable: token transfer while paused");

      // Unpause
      const unpauseTx = await tokenV2.connect(creator).unpause();
      await expect(unpauseTx).to.emit(tokenV2, "Unpaused");

      // Test that transfers work again after unpausing
      const userBBalanceBeforeTransfer = await tokenV2.balanceOf(userB.address);
      const creatorBalanceBeforeTransfer = await tokenV2.balanceOf(creator.address);

      await tokenV2.connect(userB).transfer(creator.address, transferAmount);

      expect(await tokenV2.balanceOf(userB.address)).to.equal(userBBalanceBeforeTransfer.sub(transferAmount));
      expect(await tokenV2.balanceOf(creator.address)).to.equal(creatorBalanceBeforeTransfer.add(transferAmount));

      // Test bulk transfer functionality using creator's accumulated tokens
      const currentCreatorBalance = await tokenV2.balanceOf(creator.address);
      if (currentCreatorBalance.gt(ethers.utils.parseUnits("200", 18))) {
        const bulkTransferAmount = ethers.utils.parseUnits("50", 18);
        const recipients = [userA.address, userB.address];

        const initialUserABalanceForBulk = await tokenV2.balanceOf(userA.address);
        const initialUserBBalanceForBulk = await tokenV2.balanceOf(userB.address);

        const bulkTx = await tokenV2.connect(creator).transferBulk(recipients, bulkTransferAmount);

        // Verify events were emitted
        await expect(bulkTx)
          .to.emit(tokenV2, "Transfer")
          .withArgs(creator.address, userA.address, bulkTransferAmount);
        await expect(bulkTx)
          .to.emit(tokenV2, "Transfer")
          .withArgs(creator.address, userB.address, bulkTransferAmount);

        // Verify balances
        expect(await tokenV2.balanceOf(userA.address)).to.equal(initialUserABalanceForBulk.add(bulkTransferAmount));
        expect(await tokenV2.balanceOf(userB.address)).to.equal(initialUserBBalanceForBulk.add(bulkTransferAmount));
      }

      // Test transferFromBulk functionality with approval
      const userABalanceForBulkFrom = await tokenV2.balanceOf(userA.address);
      if (userABalanceForBulkFrom.gt(ethers.utils.parseUnits("100", 18))) {
        const bulkTransferAmount = ethers.utils.parseUnits("25", 18);
        const recipients = [creator.address, userB.address];
        const totalAmount = bulkTransferAmount.mul(recipients.length);

        // userA approves userB to spend tokens
        await tokenV2.connect(userA).approve(userB.address, totalAmount);

        const initialCreatorBalanceForBulkFrom = await tokenV2.balanceOf(creator.address);
        const initialUserBBalanceForBulkFrom = await tokenV2.balanceOf(userB.address);
        const initialUserABalanceForBulkFrom = await tokenV2.balanceOf(userA.address);

        // userB calls transferFromBulk to transfer userA's tokens
        const bulkFromTx = await tokenV2.connect(userB).transferFromBulk(
          userA.address,
          recipients,
          bulkTransferAmount
        );

        // Verify events were emitted
        await expect(bulkFromTx)
          .to.emit(tokenV2, "Transfer")
          .withArgs(userA.address, creator.address, bulkTransferAmount);
        await expect(bulkFromTx)
          .to.emit(tokenV2, "Transfer")
          .withArgs(userA.address, userB.address, bulkTransferAmount);

        // Verify balances
        expect(await tokenV2.balanceOf(userA.address)).to.equal(initialUserABalanceForBulkFrom.sub(totalAmount));
        expect(await tokenV2.balanceOf(creator.address)).to.equal(initialCreatorBalanceForBulkFrom.add(bulkTransferAmount));
        expect(await tokenV2.balanceOf(userB.address)).to.equal(initialUserBBalanceForBulkFrom.add(bulkTransferAmount));
      }

      // Test the new V2 burn-on-transfer-to-contract functionality
      const userABalanceBeforeBurn = await tokenV2.balanceOf(userA.address);
      const burnAmount = ethers.utils.parseUnits("10", 18);

      if (userABalanceBeforeBurn.gt(burnAmount)) {
        const totalSupplyBefore = await tokenV2.totalSupply();

        // Transfer to the contract address should burn the tokens
        await tokenV2.connect(userA).transfer(tokenV2.address, burnAmount);

        const userABalanceAfterBurn = await tokenV2.balanceOf(userA.address);
        const contractBalance = await tokenV2.balanceOf(tokenV2.address);
        const totalSupplyAfter = await tokenV2.totalSupply();

        // Verify tokens were burned (not transferred to contract)
        expect(userABalanceAfterBurn).to.equal(userABalanceBeforeBurn.sub(burnAmount));
        expect(contractBalance).to.equal(0); // Contract should have no tokens
        expect(totalSupplyAfter).to.equal(totalSupplyBefore.sub(burnAmount)); // Total supply decreased
      }

      // Test that non-owners cannot call owner-only functions
      await expect(tokenV2.connect(userA).pause()).to.be.revertedWith("Ownable: caller is not the owner");
      await expect(tokenV2.connect(userA).authorizeSnapshotter(userB.address)).to.be.revertedWith("Ownable: caller is not the owner");

      // Verify that mint and burn functions no longer exist (should throw if called)
      // Note: These functions were removed in V2, so calling them should fail
      try {
        // @ts-ignore - Intentionally calling removed function to verify it's gone
        await tokenV2.mint(userA.address, 1000);
        expect.fail("mint function should not exist in V2");
      } catch (error: any) {
        // Expected - function doesn't exist
        expect(error.message).to.include("mint is not a function");
      }

      try {
        // @ts-ignore - Intentionally calling removed function to verify it's gone
        await tokenV2.burn(userA.address, 1000);
        expect.fail("burn function should not exist in V2");
      } catch (error: any) {
        // Expected - function doesn't exist
        expect(error.message).to.include("burn is not a function");
      }
    });
  });
});
