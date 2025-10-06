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
  let user1: SignerWithAddress;
  let user2: SignerWithAddress;

  let tokenV1: ZeroDAOToken;
  let tokenV2: ZeroDAOTokenV2;
  let mockToken: ERC20Mock;
  let preUpgradeState: ContractStorageData;

  before(async () => {
    [creator, user1, user2] = await hre.ethers.getSigners();
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

      // Connect to the token as the owner
      const tokenV2AsOwner = tokenV2.connect(creator);

      // Check initial balance of the contract
      const initialBalance = await mockToken.balanceOf(tokenV2.address);
      expect(initialBalance).to.be.gt(0);

      // Check initial balance of recipient (creator)
      const recipientInitialBalance = await mockToken.balanceOf(creator.address);

      // Define withdrawal amount
      const withdrawAmount = ethers.utils.parseUnits(DEFAULT_WITHDRAW_AMOUNT, DEFAULT_MOCK_TOKEN_DECIMALS);
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
      expect(recipientFinalBalance).to.equal(recipientInitialBalance.add(withdrawAmount));
    });

    it("should verify token functionality is preserved after upgrade", async () => {
      // Get the token owner (who can call mint)
      const tokenOwnerAddress = await tokenV2.owner();
      const accounts = await hre.ethers.getSigners();
      const ownerSigner = accounts.find(account => account.address.toLowerCase() === tokenOwnerAddress.toLowerCase()) || creator;

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
  });
});
