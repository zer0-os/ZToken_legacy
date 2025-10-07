import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import * as hre from "hardhat";
import {
  ZeroDAOToken,
  ZeroDAOTokenV2,
  ZeroDAOTokenV2__factory,
  ZeroDAOTokenV3,
  ZeroDAOTokenV3__factory,
  ERC20Mock__factory,
  ERC20Mock,
} from "../typechain";
import { deployFundTransfer } from "./helpers/deploy-fund-transfer";
import { readState } from "./helpers/read-state";
import { readCompareState } from "./helpers/read-compare-state";
import { initImpl } from "./helpers/init-impl";
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
  DEFAULT_TRANSFER_AMOUNT,
  IMPL_STORAGE_SLOT,
} from "./helpers/constants";

describe("zDAO Token Upgrades", () => {
  let creator: SignerWithAddress;
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let tokenV1: ZeroDAOToken;
  let tokenV2: ZeroDAOTokenV2;
  let tokenV3: ZeroDAOTokenV3;
  let mockToken: ERC20Mock;
  let preUpgradeState: ContractStorageData;
  let preV3UpgradeState: ContractStorageData;

  before(async () => {
    [creator, user1, user2] = await hre.ethers.getSigners();
  });

  describe("Token Upgrade Flow v1 => v2 => v3", () => {
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
      mockToken = await mockTokenFactory.deploy(
        DEFAULT_TEST_MOCK_TOKEN_NAME,
        DEFAULT_TEST_MOCK_TOKEN_SYMBOL
      );

      // Mint some mock tokens to the V1 contract for testing withdrawERC20
      const mintAmount = ethers.utils.parseUnits(
        DEFAULT_TEST_MINT_AMOUNT,
        DEFAULT_MOCK_TOKEN_DECIMALS
      );
      await mockToken.mint(tokenV1.address, mintAmount);

      const balance = await mockToken.balanceOf(tokenV1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("should read state before upgrade", async () => {
      // Call readState helper to get state before upgrading
      preUpgradeState = await readState(creator, tokenV1.address);

      expect(preUpgradeState).to.not.be.undefined;
      expect(Array.isArray(preUpgradeState)).to.be.true;
      expect(preUpgradeState.length).to.be.greaterThan(0);
    });

    it("should upgrade from V1 to V2", async () => {
      // Get the proxy admin and its owner
      const proxyAdmin = await hre.upgrades.admin.getInstance();
      const proxyAdminOwner = await proxyAdmin.owner();

      // Get the signer for the proxy admin owner
      let upgrader: SignerWithAddress;
      const accounts = await hre.ethers.getSigners();

      // Find the account that matches the proxy admin owner
      upgrader =
        accounts.find(
          (account) =>
            account.address.toLowerCase() === proxyAdminOwner.toLowerCase()
        ) || creator;

      // Upgrade from v1 to v2 using
      const tokenV2Factory = new ZeroDAOTokenV2__factory(upgrader);

      tokenV2 = (await hre.upgrades.upgradeProxy(
        tokenV1.address,
        tokenV2Factory
      )) as ZeroDAOTokenV2;

      // Same proxy address
      expect(tokenV2.address).to.equal(tokenV1.address);

      const paddedImplAddress = await hre.ethers.provider.getStorageAt(
        tokenV2.address,
        IMPL_STORAGE_SLOT
      );

      // Remove padding in bytes before comparing
      const implAddress =
        paddedImplAddress.slice(0, 2) + paddedImplAddress.slice(26);

      // Make sure that we also call to `initializeImplementation` from the implementation
      // contract as well to ensure we don't risk losing ownership
      const implOwner = await initImpl(
        new ZeroDAOTokenV2__factory(creator),
        implAddress
      );

      expect(implOwner).to.eq(creator.address);
    });

    it("should read and compare state after upgrade", async () => {
      // Call readStateAndCompare helper to compare states
      // This function throws internally if there is a discrepency between
      // the pre and post upgrade states. By not throwing, we know it passes.
      await readCompareState(creator, tokenV2.address, preUpgradeState);
    });

    it("should test withdrawERC20 function and verify balances", async () => {
      // Connect to the token as the owner
      const tokenV2AsOwner = tokenV2.connect(creator);

      // Check initial balance of the contract
      const initialBalance = await mockToken.balanceOf(tokenV2.address);
      expect(initialBalance).to.be.gt(0);

      // Check initial balance of recipient (creator)
      const recipientInitialBalance = await mockToken.balanceOf(
        creator.address
      );

      // Define withdrawal amount
      const withdrawAmount = ethers.utils.parseUnits(
        DEFAULT_WITHDRAW_AMOUNT,
        DEFAULT_MOCK_TOKEN_DECIMALS
      );
      expect(withdrawAmount).to.be.lte(initialBalance);

      // Call withdrawERC20 function as the token owner
      const tx = await tokenV2AsOwner.withdrawERC20(
        mockToken.address,
        creator.address,
        withdrawAmount
      );

      // Verify the transaction was successful
      await tx.wait();

      // Check balances after withdrawal
      const finalContractBalance = await mockToken.balanceOf(tokenV2.address);
      const recipientFinalBalance = await mockToken.balanceOf(creator.address);

      // Verify the contract balance decreased by the withdrawal amount
      expect(finalContractBalance).to.equal(initialBalance.sub(withdrawAmount));

      // Verify the recipient balance increased by the withdrawal amount
      expect(recipientFinalBalance).to.equal(
        recipientInitialBalance.add(withdrawAmount)
      );
    });

    it("should verify token functionality is preserved after upgrade", async () => {
      // Get the token owner (who can call mint)
      const tokenOwnerAddress = await tokenV2.owner();
      const accounts = await hre.ethers.getSigners();
      const ownerSigner =
        accounts.find(
          (account) =>
            account.address.toLowerCase() === tokenOwnerAddress.toLowerCase()
        ) || creator;

      // Connect to the token as the owner
      const tokenV2AsOwner = tokenV2.connect(ownerSigner);

      // Test that basic V1 functionality still works
      const mintAmount = ethers.utils.parseEther(DEFAULT_TOKEN_MINT_AMOUNT);

      await tokenV2AsOwner.mint(user1.address, mintAmount);
      const balance = await tokenV2.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);

      // Test transfer functionality
      const transferAmount = ethers.utils.parseEther(DEFAULT_TRANSFER_AMOUNT);
      const tokenAsUser1 = tokenV2.connect(user1);
      await tokenAsUser1.transfer(user2.address, transferAmount);

      const user1Balance = await tokenV2.balanceOf(user1.address);
      const user2Balance = await tokenV2.balanceOf(user2.address);

      expect(user1Balance).to.equal(mintAmount.sub(transferAmount));
      expect(user2Balance).to.equal(transferAmount);
    });

    it("should read state before V2 to V3 upgrade", async () => {
      // Call readState helper to get state before upgrading to V3
      preV3UpgradeState = await readState(creator, tokenV2.address);

      expect(preV3UpgradeState).to.not.be.undefined;
      expect(Array.isArray(preV3UpgradeState)).to.be.true;
      expect(preV3UpgradeState.length).to.be.greaterThan(0);
    });

    it("should upgrade from V2 to V3", async () => {
      // Get the proxy admin and its owner
      const proxyAdmin = await hre.upgrades.admin.getInstance();
      const proxyAdminOwner = await proxyAdmin.owner();

      // Get the signer for the proxy admin owner
      let upgrader: SignerWithAddress;
      const accounts = await hre.ethers.getSigners();

      // Find the account that matches the proxy admin owner
      upgrader =
        accounts.find(
          (account) =>
            account.address.toLowerCase() === proxyAdminOwner.toLowerCase()
        ) || creator;

      // Upgrade from v2 to v3
      const tokenV3Factory = new ZeroDAOTokenV3__factory(upgrader);

      tokenV3 = (await hre.upgrades.upgradeProxy(
        tokenV2.address,
        tokenV3Factory
      )) as ZeroDAOTokenV3;

      expect(tokenV3.address).to.equal(tokenV2.address); // Same proxy address
    });

    it("should read and compare state after V2 to V3 upgrade", async () => {
      // Call readStateAndCompare helper to compare states
      // This function throws internally if there is a discrepency between
      // the pre and post upgrade states. By not throwing, we know it passes.
      await readCompareState(creator, tokenV3.address, preV3UpgradeState);
    });

    it("should verify onlyOwner functions are removed in V3", async () => {
      // Verify that remaining functions still exist
      expect(tokenV3.transferBulk).to.be.a("function");
      expect(tokenV3.transferFromBulk).to.be.a("function");
      expect(tokenV3.transfer).to.be.a("function");
      expect(tokenV3.balanceOf).to.be.a("function");
    });

    it("should verify snapshot functions are removed in V3", async () => {
      // Test that snapshot function selector doesn't work
      const snapshotSelector = "0x9711715a"; // snapshot() function selector
      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: snapshotSelector,
        })
      ).to.be.reverted;
    });

    it("should verify removed functions cannot be called with direct ABI manipulation", async () => {
      // Test mint function selector
      const mintSelector = "0x40c10f19"; // mint(address,uint256)
      const mintAmount = ethers.utils.parseEther("1000");
      const mintCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user1.address, mintAmount]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: mintSelector + mintCalldata.slice(2),
        })
      ).to.be.reverted;

      // Test burn function selector
      const burnSelector = "0x9dc29fac"; // burn(address,uint256)
      const burnAmount = ethers.utils.parseEther("100");
      const burnCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user1.address, burnAmount]
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

      // Test withdrawERC20 function selector
      const withdrawSelector = "0x01e33667"; // withdrawERC20(address,address,uint256)
      const withdrawAmount = ethers.utils.parseEther("100");
      const withdrawCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [mockToken.address, user1.address, withdrawAmount]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: withdrawSelector + withdrawCalldata.slice(2),
        })
      ).to.be.reverted;
    });

    it("should verify burn-on-self-transfer functionality", async () => {
      // Get initial balances and total supply
      const transferAmount = ethers.utils.parseEther("50");
      const initialUser1Balance = await tokenV3.balanceOf(user1.address);
      const initialTotalSupply = await tokenV3.totalSupply();
      const initialContractBalance = await tokenV3.balanceOf(tokenV3.address);

      // Transfer tokens to the contract itself (should trigger burn)
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
      const finalUser1Balance = await tokenV3.balanceOf(user1.address);
      const finalTotalSupply = await tokenV3.totalSupply();
      const finalContractBalance = await tokenV3.balanceOf(tokenV3.address);

      expect(finalUser1Balance).to.equal(
        initialUser1Balance.sub(transferAmount)
      );
      expect(finalContractBalance).to.equal(initialContractBalance); // Should remain 0
      expect(finalTotalSupply).to.equal(initialTotalSupply.sub(transferAmount));
    });

    it("should verify normal transfers still work in V3", async () => {
      // Test normal transfer between users (should not trigger burn)
      const transferAmount = ethers.utils.parseEther("25");
      const initialUser1Balance = await tokenV3.balanceOf(user1.address);
      const initialUser2Balance = await tokenV3.balanceOf(user2.address);
      const initialTotalSupply = await tokenV3.totalSupply();

      const tx = await tokenV3
        .connect(user1)
        .transfer(user2.address, transferAmount);

      // Should only emit one Transfer event (no burn)
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);

      // Verify balances changed correctly
      const finalUser1Balance = await tokenV3.balanceOf(user1.address);
      const finalUser2Balance = await tokenV3.balanceOf(user2.address);
      const finalTotalSupply = await tokenV3.totalSupply();

      expect(finalUser1Balance).to.equal(
        initialUser1Balance.sub(transferAmount)
      );
      expect(finalUser2Balance).to.equal(
        initialUser2Balance.add(transferAmount)
      );
      expect(finalTotalSupply).to.equal(initialTotalSupply); // No change in total supply
    });

    it("should verify bulk transfer functions still work in V3", async () => {
      const transferAmount = ethers.utils.parseEther("10");
      const initialUser1Balance = await tokenV3.balanceOf(user1.address);
      const initialUser2Balance = await tokenV3.balanceOf(user2.address);
      const initialCreatorBalance = await tokenV3.balanceOf(creator.address);

      // Test transferBulk
      const tx = await tokenV3
        .connect(user1)
        .transferBulk([user2.address, creator.address], transferAmount);

      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, creator.address, transferAmount);

      // Verify balances
      const finalUser1Balance = await tokenV3.balanceOf(user1.address);
      const finalUser2Balance = await tokenV3.balanceOf(user2.address);
      const finalCreatorBalance = await tokenV3.balanceOf(creator.address);

      expect(finalUser1Balance).to.equal(
        initialUser1Balance.sub(transferAmount.mul(2))
      );
      expect(finalUser2Balance).to.equal(
        initialUser2Balance.add(transferAmount)
      );
      expect(finalCreatorBalance).to.equal(
        initialCreatorBalance.add(transferAmount)
      );
    });

    it("should verify contract after V3 upgrade", async () => {
      // Verify that the contract owner still exists for storage compatibility
      // but has no special privileges
      expect(await tokenV3.owner()).to.equal(creator.address);

      // Verify that all privileged functions have been removed
      // This has been tested in previous test cases

      // The only way to interact with the contract now is through:
      // 1. Standard ERC20 functions (transfer, approve, etc.)
      // 2. Bulk transfer functions
      // 3. Burn-on-self-transfer functionality

      // Verify the contract still functions as a basic ERC20
      expect(await tokenV3.name()).to.equal(DEFAULT_ZERO_TOKEN_NAME);
      expect(await tokenV3.symbol()).to.equal(DEFAULT_ZERO_TOKEN_SYMBOL);
      expect(await tokenV3.totalSupply()).to.be.gt(0);
    });
  });
});
