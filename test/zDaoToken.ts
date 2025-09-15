import { BigNumber } from "@ethersproject/bignumber";
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

describe("zDAO Token", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: ZeroDAOToken;

  // Update as needed for testing
  const decimals = 6;

  before(async () => {
    accounts = await ethers.getSigners();
    creator = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
  });

  // old ignore
  const reDeployBefore = () => {
    before(async () => {
      const tokenFactory = new ZeroDAOToken__factory(creator);

      // In non-test environments this needs to be done using the oz upgrade library
      token = await tokenFactory.deploy();
      await token.initialize("WILDER TEST", "WLD");
    });
  };

  describe("mint", () => {
    reDeployBefore();

    const mintedAmount = BigNumber.from(1000);

    it("creator can mint tokens", async () => {
      const tx = await token.mint(user1.address, mintedAmount);

      expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1.address, mintedAmount);
    });

    it("prevents non-creator from minting tokens", async () => {
      const tokenAsUser1 = await token.connect(user1.address);
      const tx = tokenAsUser1.mint(user1.address, mintedAmount);

      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("has proper balance", async () => {
      expect(await token.balanceOf(user1.address)).to.eq(mintedAmount);
    });
  });

  describe("snapshot", () => {
    it("allows the token owner to create snapshot 1", async () => {
      const tx = await token.snapshot();
      expect(tx).to.emit(token, "Snapshot").withArgs(1);
    });

    let expectedAmount: BigNumber;

    it("returns the expected amount from snapshot 1", async () => {
      expectedAmount = await token.balanceOf(user1.address);
      const balanceAtSnapshot = await token.balanceOfAt(user1.address, 1);
      expect(balanceAtSnapshot).to.eq(expectedAmount);
    });

    it("does not change snapshot 1 when balances change", async () => {
      const mintedAmount = BigNumber.from(1000);
      await token.mint(user1.address, mintedAmount);
      const balanceAtSnapshot = await token.balanceOfAt(user1.address, 1);
      expect(balanceAtSnapshot).to.eq(expectedAmount);
    });

    it("reflects new balances in snapshot 2", async () => {
      expectedAmount = await token.balanceOf(user1.address);
      await token.snapshot();
      const balanceAtSnapshot = await token.balanceOfAt(user1.address, 2);
      expect(balanceAtSnapshot).to.eq(expectedAmount);
    });

    it("reflects balance changes via transfer in snapshot 3", async () => {
      const tokenAsUser1 = await token.connect(user1);

      const transferAmount = 100;
      await tokenAsUser1.transfer(user2.address, transferAmount);
      await token.snapshot();

      expectedAmount = await token.balanceOf(user1.address);
      let balanceAtSnapshot = await token.balanceOfAt(user1.address, 3);
      expect(balanceAtSnapshot).to.eq(expectedAmount);

      // user 2
      balanceAtSnapshot = await token.balanceOfAt(user2.address, 3);
      expect(balanceAtSnapshot).to.eq(transferAmount);
    });
  });

  describe("bulk transfer", async () => {
    it("allows bulk transfer", async () => {
      const tokenAsUser1 = await token.connect(user1);

      const transferAmount = 100;
      const tx = await tokenAsUser1.transferBulk(
        [user2.address, user3.address],
        transferAmount
      );

      expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user3.address, transferAmount);
    });

    it("reflects new balances in snapshot 4", async () => {
      const expectedAmount = await token.balanceOf(user1.address);
      await token.snapshot();

      let balanceAtSnapshot = await token.balanceOfAt(user1.address, 4);
      expect(balanceAtSnapshot).to.eq(expectedAmount);
      balanceAtSnapshot = await token.balanceOfAt(user3.address, 4);
      expect(balanceAtSnapshot).to.eq(100);
    });

    it("allows bulk from transfer", async () => {
      const tokenAsUser1 = await token.connect(user1);
      tokenAsUser1.approve(user2.address, 200);

      const tokenAsUser2 = await token.connect(user2);

      const transferAmount = 100;
      const tx = await tokenAsUser2.transferFromBulk(
        user1.address,
        [user2.address, user3.address],
        transferAmount
      );

      expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      expect(tx)
        .to.emit(token, "Transfer")
        .withArgs(user1.address, user3.address, transferAmount);
    });

    it("reflects new balances in snapshot 5", async () => {
      const expectedAmount = await token.balanceOf(user1.address);
      await token.snapshot();

      let balanceAtSnapshot = await token.balanceOfAt(user1.address, 5);
      expect(balanceAtSnapshot).to.eq(expectedAmount);
      balanceAtSnapshot = await token.balanceOfAt(user3.address, 5);
      expect(balanceAtSnapshot).to.eq(200);
    });

    it("reverts on overflow attack", async () => {
      const tokenAsUser1 = await token.connect(user1);

      const transferAmount = BigNumber.from(2).pow(255);
      const tx = tokenAsUser1.transferFromBulk(
        user1.address,
        [user1.address, user2.address],
        transferAmount
      );

      await expect(tx).to.be.reverted;
    });
  });

  describe("snapshot auth", () => {
    it("disallows unauthorized accounts to snapshot", async () => {
      const tokenAsUser1 = await token.connect(user1);
      await expect(tokenAsUser1.snapshot()).to.be.revertedWith(
        "zDAOToken: Not authorized to snapshot"
      );
    });

    it("allows the owner to authorize a user to snapshot", async () => {
      const tx = await token.authorizeSnapshotter(user1.address);
      expect(tx)
        .to.emit(token, "AuthorizedSnapshotter")
        .withArgs(user1.address);
    });

    it("allows authorized accounts to snapshot", async () => {
      const tokenAsUser1 = await token.connect(user1);
      const tx = await tokenAsUser1.snapshot();
      expect(tx).to.emit(token, "Snapshot");
    });

    it("allows the owner to deauthorize a user to snapshot", async () => {
      const tx = await token.deauthorizeSnapshotter(user1.address);
      expect(tx)
        .to.emit(token, "DeauthorizedSnapshotter")
        .withArgs(user1.address);
    });

    it("disallows newly unauthorized accounts to snapshot", async () => {
      const tokenAsUser1 = await token.connect(user1);
      await expect(tokenAsUser1.snapshot()).to.be.revertedWith(
        "zDAOToken: Not authorized to snapshot"
      );
    });

    it("disallows non owner to authorize an account to snapshot", async () => {
      const tokenAsUser1 = await token.connect(user1);
      await expect(
        tokenAsUser1.authorizeSnapshotter(user1.address)
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });
  });

  describe("pause/unpause", () => {
    it("prevents a non owner from pausing", async () => {
      const tokenAsUser1 = await token.connect(user1);
      const tx = tokenAsUser1.pause();
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("allows the owner to pause transactions", async () => {
      expect(await token.pause()).to.emit(token, "Paused");
    });

    it("prevents transfer of tokens when paused", async () => {
      const tokenAsUser1 = await token.connect(user1);
      const tx = tokenAsUser1.transfer(user2.address, 100);
      await expect(tx).to.be.revertedWith(
        "ERC20Pausable: token transfer while paused"
      );
    });

    it("prevents a non owner from unpausing", async () => {
      const tokenAsUser1 = await token.connect(user1);
      const tx = tokenAsUser1.unpause();
      await expect(tx).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("allows the owner to unpause transactions", async () => {
      expect(await token.unpause()).to.emit(token, "Unpaused");
    });
  });

  describe("ZeroDAOToken to ZeroDAOTokenV2 upgrade test - mint function removal", () => {
    let originalToken: ZeroDAOToken;
    let upgradedToken: ZeroDAOTokenV2;

    it("deploys original ZeroDAOToken contract with mint function", async () => {
      // Deploy the original ZeroDAOToken using the original factory
      originalToken = await hre.upgrades.deployProxy(
        new ZeroDAOToken__factory(creator),
        ["Test DAO Token", "TDT"]
      ) as ZeroDAOToken;

      await originalToken.deployed();

      // Verify deployment
      expect(await originalToken.name()).to.equal("Test DAO Token");
      expect(await originalToken.symbol()).to.equal("TDT");
      expect(await originalToken.owner()).to.equal(creator.address);
    });

    it("confirms mint function works in original contract", async () => {
      const mintAmount = ethers.utils.parseUnits("1000", decimals);

      // Verify mint function exists and works
      const tx = await originalToken.connect(creator).mint(user1.address, mintAmount);

      // Check that the transaction was successful
      await expect(tx)
        .to.emit(originalToken, "Transfer")
        .withArgs(ethers.constants.AddressZero, user1.address, mintAmount);

      // Verify balance was updated
      const balance = await originalToken.balanceOf(user1.address);
      expect(balance).to.equal(mintAmount);
    });

    it("upgrades ZeroDAOToken to ZeroDAOTokenV2", async () => {
      // Store pre-upgrade state
      const preUpgradeName = await originalToken.name();
      const preUpgradeSymbol = await originalToken.symbol();
      const preUpgradeOwner = await originalToken.owner();
      const preUpgradeTotalSupply = await originalToken.totalSupply();
      const preUpgradeUser1Balance = await originalToken.balanceOf(user1.address);

      // Perform the upgrade
      upgradedToken = await hre.upgrades.upgradeProxy(
        originalToken.address,
        new ZeroDAOTokenV2__factory(creator)
      ) as ZeroDAOTokenV2;

      // Verify the upgrade was successful
      expect(upgradedToken.address).to.equal(originalToken.address);

      // Verify state variables are preserved
      expect(await upgradedToken.name()).to.equal(preUpgradeName);
      expect(await upgradedToken.symbol()).to.equal(preUpgradeSymbol);
      expect(await upgradedToken.owner()).to.equal(preUpgradeOwner);
      expect(await upgradedToken.totalSupply()).to.equal(preUpgradeTotalSupply);
      expect(await upgradedToken.balanceOf(user1.address)).to.equal(preUpgradeUser1Balance);
    });

    it("confirms mint function is no longer accessible", async () => {
      // Try to call mint function - this should fail at compile time
      // Since TypeScript types are generated from the contract ABI,
      // the mint function should not exist in ZeroDAOTokenV2 interface

      // We can test this by trying to access the function and expecting it to not exist
      expect((upgradedToken as any).mint).to.be.undefined;
    });

    it("confirms other functions still work after upgrade", async () => {
      // Test that other functions like burn, pause, snapshot still work

      // Test burn function (should still exist)
      const burnAmount = ethers.utils.parseUnits("100", decimals);
      const initialBalance = await upgradedToken.balanceOf(user1.address);

      const tx = await upgradedToken.connect(creator).burn(user1.address, burnAmount);

      await expect(tx)
        .to.emit(upgradedToken, "Transfer")
        .withArgs(user1.address, ethers.constants.AddressZero, burnAmount);

      const finalBalance = await upgradedToken.balanceOf(user1.address);
      expect(finalBalance).to.equal(initialBalance.sub(burnAmount));

      // Test snapshot function (should still exist)
      const snapshotTx = await upgradedToken.connect(creator).snapshot();
      await expect(snapshotTx).to.emit(upgradedToken, "Snapshot");

      // Test withdrawERC20 function (should exist in V2)
      expect(upgradedToken.withdrawERC20).to.be.a('function');
    });

    it("confirms mint function cannot be called even with direct ABI manipulation", async () => {
      // Even if someone tries to call mint directly using the ABI, it should fail
      // because the function doesn't exist in the upgraded contract

      const mintSelector = "0x40c10f19"; // mint(address,uint256) function selector
      const mintAmount = ethers.utils.parseUnits("1000", decimals);

      // Encode the function call
      const mintCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user2.address, mintAmount]
      );

      // Try to call the function directly - should fail
      await expect(
        creator.sendTransaction({
          to: upgradedToken.address,
          data: mintSelector + mintCalldata.slice(2)
        })
      ).to.be.reverted; // Should revert because function doesn't exist
    });
  });

  describe("ZeroDAOToken to ZeroDAOTokenGenerated upgrade test - withdraw ERC20 token", () => {
    let zeroDAOToken: ZeroDAOToken;
    let mockToken: ERC20Mock;
    let upgradedZeroDAOToken: ZeroDAOTokenV2;

    const testTokenAmount = ethers.utils.parseUnits("500000", decimals); // 500k tokens with decimals decimals

    it("Initial deployments", async () => {
      // Deploy the original ZeroDAOToken using the original factory
      zeroDAOToken = await hre.upgrades.deployProxy(
        new ZeroDAOToken__factory(creator),
        ["Test DAO Token", "TDT"]
      ) as ZeroDAOToken;

      await zeroDAOToken.deployed();

      // Verify deployment
      expect(await zeroDAOToken.name()).to.equal("Test DAO Token");
      expect(await zeroDAOToken.symbol()).to.equal("TDT");
      expect(await zeroDAOToken.owner()).to.equal(creator.address);

      // Deploy ERC20Mock
      const mockTokenFactory = new ERC20Mock__factory(creator);
      mockToken = await mockTokenFactory.deploy("Test Mock Token", "TMT");
      await mockToken.deployed();

      // Verify deployment
      expect(await mockToken.name()).to.equal("Test Mock Token");
      expect(await mockToken.symbol()).to.equal("TMT");
    });

    it("gives ERC20Mock tokens to ZeroDAOToken contract", async () => {
      // Mint tokens directly to the ZeroDAOToken contract
      await mockToken.connect(creator).mint(zeroDAOToken.address, testTokenAmount);

      // Verify the contract received the tokens
      const contractBalance = await mockToken.balanceOf(zeroDAOToken.address);
      expect(contractBalance).to.equal(testTokenAmount);
    });

    it("upgrades ZeroDAOToken to ZeroDAOTokenGenerated", async () => {
      // Store pre-upgrade state
      const preUpgradeName = await zeroDAOToken.name();
      const preUpgradeSymbol = await zeroDAOToken.symbol();
      const preUpgradeOwner = await zeroDAOToken.owner();
      const preUpgradeTotalSupply = await zeroDAOToken.totalSupply();
      const preUpgradeBalance = await mockToken.balanceOf(zeroDAOToken.address);

      // Perform the upgrade
      upgradedZeroDAOToken = await hre.upgrades.upgradeProxy(
        zeroDAOToken.address,
        new ZeroDAOTokenV2__factory(creator)
      ) as ZeroDAOTokenV2;

      // Verify the upgrade was successful
      expect(upgradedZeroDAOToken.address).to.equal(zeroDAOToken.address);

      // Verify state variables are preserved
      expect(await upgradedZeroDAOToken.name()).to.equal(preUpgradeName);
      expect(await upgradedZeroDAOToken.symbol()).to.equal(preUpgradeSymbol);
      expect(await upgradedZeroDAOToken.owner()).to.equal(preUpgradeOwner);
      expect(await upgradedZeroDAOToken.totalSupply()).to.equal(preUpgradeTotalSupply);
      expect(await mockToken.balanceOf(upgradedZeroDAOToken.address)).to.equal(preUpgradeBalance);
    });

    it("calls withdrawERC20 to withdraw that balance amount to an EOA", async () => {
      const initialRecipientBalance = await mockToken.balanceOf(user1.address);
      const initialContractBalance = await mockToken.balanceOf(upgradedZeroDAOToken.address);

      // Call withdrawERC20 function
      const tx = await upgradedZeroDAOToken.connect(creator).withdrawERC20(
        mockToken.address,
        user1.address,
        testTokenAmount
      );

      // Verify the transaction emitted the correct event
      await expect(tx)
        .to.emit(upgradedZeroDAOToken, "ERC20TokenWithdrawn")
        .withArgs(mockToken.address, user1.address, testTokenAmount);

      // Check contract balance (should be 0)
      const finalContractBalance = await mockToken.balanceOf(upgradedZeroDAOToken.address);
      expect(finalContractBalance).to.equal(0);
      expect(finalContractBalance).to.equal(initialContractBalance.sub(testTokenAmount));

      // Check recipient balance (should have received the tokens)
      const finalRecipientBalance = await mockToken.balanceOf(user1.address);
      expect(finalRecipientBalance).to.equal(initialRecipientBalance.add(testTokenAmount));
    });

    it("tests withdrawERC20 with amount 0 (withdraw all)", async () => {
      // First, give the contract some more tokens
      const additionalAmount = ethers.utils.parseUnits("100000", decimals);
      await mockToken.connect(creator).mint(upgradedZeroDAOToken.address, additionalAmount);

      const initialRecipientBalance = await mockToken.balanceOf(user2.address);

      // Call withdrawERC20 with amount 0 (should withdraw all)
      const tx = upgradedZeroDAOToken.connect(creator).withdrawERC20(
        mockToken.address,
        user2.address,
        0 // This should withdraw total contract balance of `token` given
      );

      // Verify the transaction emitted the correct event with the full amount
      expect(await tx)
        .to.emit(upgradedZeroDAOToken, "ERC20TokenWithdrawn")
        .withArgs(mockToken.address, user2.address, additionalAmount);

      // Check final balances
      const finalContractBalance = await mockToken.balanceOf(upgradedZeroDAOToken.address);
      const finalRecipientBalance = await mockToken.balanceOf(user2.address);

      expect(finalContractBalance).to.equal(0);
      expect(finalRecipientBalance).to.equal(initialRecipientBalance.add(additionalAmount));
    });

    it("Fails when called by non-owner", async () => {
      // Give the contract some tokens first
      const testAmount = ethers.utils.parseUnits("1000", decimals);
      await mockToken.connect(creator).mint(upgradedZeroDAOToken.address, testAmount);

      // Try to call withdrawERC20 from non-owner account
      await expect(
        upgradedZeroDAOToken.connect(user1).withdrawERC20(
          mockToken.address,
          user1.address,
          testAmount
        )
      ).to.be.revertedWith("Ownable: caller is not the owner");
    });

    it("Fails when token or recipient address is zero zero", async () => {
      const testAmount = ethers.utils.parseUnits("1000", decimals);

      // Test zero token address
      await expect(
        upgradedZeroDAOToken.connect(creator).withdrawERC20(
          ethers.constants.AddressZero,
          user1.address,
          testAmount
        )
      ).to.be.revertedWith("zDAOToken: Token address cannot be zero");

      // Test zero recipient address
      await expect(
        upgradedZeroDAOToken.connect(creator).withdrawERC20(
          mockToken.address,
          ethers.constants.AddressZero,
          testAmount
        )
      ).to.be.revertedWith("zDAOToken: Recipient address cannot be zero");
    });

    it("Fails when contract has insufficient token balance", async () => {
      // Test insufficient balance (contract has 1000, trying to withdraw 2000)
      await expect(
        upgradedZeroDAOToken.connect(creator).withdrawERC20(
          mockToken.address,
          user1.address,
          ethers.utils.parseUnits("2000", decimals)
        )
      ).to.be.revertedWith("zDAOToken: Insufficient token balance");
    })
  });
});
