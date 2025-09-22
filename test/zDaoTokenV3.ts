import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ERC20Mock,
  ERC20Mock__factory,
  ZeroDAOTokenV2__factory,
  ZeroDAOTokenV2,
  ZeroDAOTokenV3__factory,
  ZeroDAOTokenV3,
} from "../typechain";

import * as hre from "hardhat";


describe("zDAOTokenV3 Upgrade test", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let tokenV2: ZeroDAOTokenV2;
  let tokenV3: ZeroDAOTokenV3;
  let mockToken: ERC20Mock;

  // Update as needed for testing
  const decimals = 6;
  const initialMintAmount = ethers.utils.parseUnits("10000", decimals);
  const testTokenAmount = ethers.utils.parseUnits("1000", decimals);

  before(async () => {
    accounts = await ethers.getSigners();
    creator = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
  });

  describe("ZeroDAOTokenV2 to ZeroDAOTokenV3 upgrade test", () => {
    it("deploys ZeroDAOTokenV2 contract", async () => {
      // Deploy ZeroDAOTokenV2
      tokenV2 = await hre.upgrades.deployProxy(
        new ZeroDAOTokenV2__factory(creator),
        ["Test DAO Token V2", "TDT2"]
      ) as ZeroDAOTokenV2;

      await tokenV2.deployed();

      // Verify deployment
      expect(await tokenV2.name()).to.equal("Test DAO Token V2");
      expect(await tokenV2.symbol()).to.equal("TDT2");
      expect(await tokenV2.owner()).to.equal(creator.address);

      // Deploy mock token for testing withdrawERC20
      const mockTokenFactory = new ERC20Mock__factory(creator);
      mockToken = await mockTokenFactory.deploy("Mock Token", "MOCK");
      await mockToken.deployed();
    });

    it("validates pre-upgrade state variables and user balances", async () => {
      // Mint tokens to users
      await tokenV2.connect(creator).mint(user1.address, initialMintAmount);
      await tokenV2.connect(creator).mint(user2.address, initialMintAmount.div(2));

      // Authorize user1 to take snapshots
      await tokenV2.connect(creator).authorizeSnapshotter(user1.address);

      // Give the contract funds
      await mockToken.connect(creator).mint(tokenV2.address, testTokenAmount);

      // Verify pre-upgrade state
      expect(await tokenV2.balanceOf(user1.address)).to.equal(initialMintAmount);
      expect(await tokenV2.balanceOf(user2.address)).to.equal(initialMintAmount.div(2));
      expect(await tokenV2.totalSupply()).to.equal(initialMintAmount.add(initialMintAmount.div(2)));
      expect(await mockToken.balanceOf(tokenV2.address)).to.equal(testTokenAmount);

      // Verify onlyOwner functions work in V2
      expect(tokenV2.mint).to.be.a('function');
      expect(tokenV2.burn).to.be.a('function');
      expect(tokenV2.pause).to.be.a('function');
      expect(tokenV2.unpause).to.be.a('function');
      expect(tokenV2.authorizeSnapshotter).to.be.a('function');
      expect(tokenV2.deauthorizeSnapshotter).to.be.a('function');
      expect(tokenV2.withdrawERC20).to.be.a('function');

      // Test that onlyOwner functions work
      const burnAmount = ethers.utils.parseUnits("100", decimals);
      await tokenV2.connect(creator).burn(user1.address, burnAmount);
      expect(await tokenV2.balanceOf(user1.address)).to.equal(initialMintAmount.sub(burnAmount));
    });

    it("upgrades ZeroDAOTokenV2 to ZeroDAOTokenV3", async () => {
      // Store pre-upgrade state
      const preUpgradeName = await tokenV2.name();
      const preUpgradeSymbol = await tokenV2.symbol();
      const preUpgradeOwner = await tokenV2.owner();
      const preUpgradeTotalSupply = await tokenV2.totalSupply();
      const preUpgradeUser1Balance = await tokenV2.balanceOf(user1.address);
      const preUpgradeUser2Balance = await tokenV2.balanceOf(user2.address);
      const preUpgradeMockTokenBalance = await mockToken.balanceOf(tokenV2.address);

      // Perform the upgrade
      tokenV3 = await hre.upgrades.upgradeProxy(
        tokenV2.address,
        new ZeroDAOTokenV3__factory(creator)
      ) as ZeroDAOTokenV3;

      expect(tokenV3.address).to.equal(tokenV2.address);

      // Verify state variables are preserved
      expect(await tokenV3.name()).to.equal(preUpgradeName);
      expect(await tokenV3.symbol()).to.equal(preUpgradeSymbol);
      expect(await tokenV3.owner()).to.equal(preUpgradeOwner);
      expect(await tokenV3.totalSupply()).to.equal(preUpgradeTotalSupply);
      expect(await tokenV3.balanceOf(user1.address)).to.equal(preUpgradeUser1Balance);
      expect(await tokenV3.balanceOf(user2.address)).to.equal(preUpgradeUser2Balance);
      expect(await mockToken.balanceOf(tokenV3.address)).to.equal(preUpgradeMockTokenBalance);
    });

    it("confirms onlyOwner functions are no longer present", async () => {
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
      expect(tokenV3.transferBulk).to.be.a('function');
      expect(tokenV3.transferFromBulk).to.be.a('function');
      expect(tokenV3.transfer).to.be.a('function');
      expect(tokenV3.balanceOf).to.be.a('function');
    });

    it("confirms user balances are unchanged after upgrade", async () => {
      // Verify user balances are preserved
      const expectedUser1Balance = initialMintAmount.sub(ethers.utils.parseUnits("100", decimals)); // minus the burn from pre-upgrade test
      const expectedUser2Balance = initialMintAmount.div(2);

      expect(await tokenV3.balanceOf(user1.address)).to.equal(expectedUser1Balance);
      expect(await tokenV3.balanceOf(user2.address)).to.equal(expectedUser2Balance);
      expect(await tokenV3.totalSupply()).to.equal(expectedUser1Balance.add(expectedUser2Balance));
    });

    it("confirms onlyOwner functions cannot be called with direct ABI manipulation", async () => {
      // Test mint function selector
      const mintSelector = "0x40c10f19"; // mint(address,uint256)
      const mintAmount = ethers.utils.parseUnits("1000", decimals);
      const mintCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user3.address, mintAmount]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: mintSelector + mintCalldata.slice(2)
        })
      ).to.be.reverted;

      // Test burn function selector
      const burnSelector = "0x9dc29fac"; // burn(address,uint256)
      const burnCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "uint256"],
        [user1.address, ethers.utils.parseUnits("100", decimals)]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: burnSelector + burnCalldata.slice(2)
        })
      ).to.be.reverted;

      // Test pause function selector
      const pauseSelector = "0x8456cb59"; // pause()
      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: pauseSelector
        })
      ).to.be.reverted;

      // Test withdrawERC20 function selector
      const withdrawSelector = "0x01e33667"; // withdrawERC20(address,address,uint256)
      const withdrawCalldata = ethers.utils.defaultAbiCoder.encode(
        ["address", "address", "uint256"],
        [mockToken.address, user1.address, testTokenAmount]
      );

      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: withdrawSelector + withdrawCalldata.slice(2)
        })
      ).to.be.reverted;
    });

    it("confirms snapshot function is no longer available", async () => {
      // Snapshot function should be completely removed from V3
      expect((tokenV3 as any).snapshot).to.be.undefined;

      // Test that snapshot function selector doesn't work
      const snapshotSelector = "0x9711715a"; // snapshot() function selector
      await expect(
        creator.sendTransaction({
          to: tokenV3.address,
          data: snapshotSelector
        })
      ).to.be.reverted;
    });

    it("confirms bulk transfer functions still work", async () => {
      const transferAmount = ethers.utils.parseUnits("50", decimals);

      // Test transferBulk
      const initialUser1Balance = await tokenV3.balanceOf(user1.address);
      const initialUser2Balance = await tokenV3.balanceOf(user2.address);
      const initialUser3Balance = await tokenV3.balanceOf(user3.address);

      const tx = await tokenV3.connect(user1).transferBulk(
        [user2.address, user3.address],
        transferAmount
      );

      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user2.address, transferAmount);
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, user3.address, transferAmount);

      // Verify balances
      expect(await tokenV3.balanceOf(user1.address)).to.equal(
        initialUser1Balance.sub(transferAmount.mul(2))
      );
      expect(await tokenV3.balanceOf(user2.address)).to.equal(
        initialUser2Balance.add(transferAmount)
      );
      expect(await tokenV3.balanceOf(user3.address)).to.equal(
        initialUser3Balance.add(transferAmount)
      );

      // Test transferFromBulk
      const transferFromAmount = ethers.utils.parseUnits("25", decimals);

      // First approve user3 to spend from user2
      await tokenV3.connect(user2).approve(user3.address, transferFromAmount.mul(2));

      const tx2 = await tokenV3.connect(user3).transferFromBulk(
        user2.address,
        [user1.address, creator.address],
        transferFromAmount
      );

      await expect(tx2)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user2.address, user1.address, transferFromAmount);
      await expect(tx2)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user2.address, creator.address, transferFromAmount);
    });

    it("confirms burn-on-self-transfer functionality works", async () => {
      const transferAmount = ethers.utils.parseUnits("100", decimals);
      const initialBalance = await tokenV3.balanceOf(user1.address);
      const initialTotalSupply = await tokenV3.totalSupply();

      // Transfer to self (contract address) should burn tokens
      const tx = await tokenV3.connect(user1).transfer(tokenV3.address, transferAmount);

      // Should emit Transfer to contract and then Transfer from contract to zero (burn)
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(user1.address, tokenV3.address, transferAmount);
      await expect(tx)
        .to.emit(tokenV3, "Transfer")
        .withArgs(tokenV3.address, ethers.constants.AddressZero, transferAmount);

      // Verify tokens were burned
      expect(await tokenV3.balanceOf(user1.address)).to.equal(initialBalance.sub(transferAmount));
      expect(await tokenV3.balanceOf(tokenV3.address)).to.equal(0); // Contract should have 0 balance
      expect(await tokenV3.totalSupply()).to.equal(initialTotalSupply.sub(transferAmount));
    });

    it("confirms contract is now fully decentralized", async () => {
      // Verify that the contract owner cannot perform any privileged operations
      // All onlyOwner functions should be removed

      // The contract should still inherit from OwnableUpgradeable for storage compatibility
      // but no functions should use the onlyOwner modifier
      expect(await tokenV3.owner()).to.equal(creator.address); // Owner still exists for storage compatibility

      // But owner has no special privileges - cannot mint, burn, pause, etc.
      // This has been verified in previous tests by checking function removal

      // The only way to interact with the contract now is through:
      // 1. Standard ERC20 functions (transfer, approve, etc.)
      // 2. Bulk transfer functions
      // 3. Burn-on-self-transfer functionality

      // Verify total supply is correct after all operations
      const finalTotalSupply = await tokenV3.totalSupply();
      const expectedSupply = initialMintAmount.add(initialMintAmount.div(2)) // initial mints
        .sub(ethers.utils.parseUnits("100", decimals)) // burn in pre-upgrade test
        .sub(ethers.utils.parseUnits("100", decimals)); // burn-on-self-transfer test

      expect(finalTotalSupply).to.equal(expectedSupply);
    });
  });
});
