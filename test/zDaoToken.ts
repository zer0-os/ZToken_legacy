import { BigNumber } from "@ethersproject/bignumber";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import { ZeroToken, ZeroToken__factory } from "../typechain";

describe("zToken", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: ZeroToken;

  before(async () => {
    accounts = await ethers.getSigners();
    creator = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];
  });

  const reDeployBefore = () => {
    before(async () => {
      const tokenFactory = new ZeroToken__factory(creator);

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
});
