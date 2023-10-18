import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";
import { ContractTransaction } from "ethers";

import { MerkleDistributorInfo } from "../utilities/airdrop/createMerkle";

import * as fs from "fs";
import {
  MerkleTokenAirdrop,
  MerkleTokenAirdrop__factory,
  ZeroToken,
  ZeroToken__factory,
} from "../typechain";

chai.use(solidity);
const { expect } = chai;

/**
 * Depends on this JSON file for testing.
 * Please do not change values in this JSON file unless you intend to change tests to match.
 */
const merkleTreeFilePath = "./test/resources/airdrop/testMerkle.json";

describe("End 2 End Tests - Merkle Token Airdrop", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: ZeroToken;
  let airdrop: MerkleTokenAirdrop;

  let merkleTree: MerkleDistributorInfo;

  before(async () => {
    accounts = await ethers.getSigners();
    creator = accounts[0];
    user1 = accounts[1];
    user2 = accounts[2];
    user3 = accounts[3];

    // assume it's right
    merkleTree = JSON.parse(
      fs.readFileSync(merkleTreeFilePath).toString()
    ) as MerkleDistributorInfo;
  });

  describe("setup", () => {
    it("deploys a zDAO token", async () => {
      const tokenFactory = new ZeroToken__factory(creator);

      // In non-test environments this needs to be done using the oz upgrade library
      token = await tokenFactory.deploy();
      await token.initialize("WILDER TEST", "WLD");
    });

    it("deploys a merkle token airdrop contract", async () => {
      const factory = new MerkleTokenAirdrop__factory(creator);

      airdrop = await factory.deploy(token.address, merkleTree.merkleRoot);
    });
  });

  describe("minting tokens for airdrop", () => {
    it("allows the token owner to mint the vesting contract tokens", async () => {
      await token.mint(airdrop.address, merkleTree.tokenTotal);

      expect(await token.balanceOf(airdrop.address)).to.eq(
        merkleTree.tokenTotal
      );
    });
  });

  describe("claiming token airdrops", () => {
    describe("standard path", () => {
      let claimTx: ContractTransaction;

      it("allows a user to claim their airdropped tokens", async () => {
        const airdropAsUser1 = await airdrop.connect(user1);
        const claim = merkleTree.claims[user1.address];

        claimTx = await airdropAsUser1.claim(
          claim.index,
          user1.address,
          claim.amount,
          claim.proof
        );
      });

      it("emits a 'Claimed' event when a user claims their tokens", async () => {
        const claim = merkleTree.claims[user1.address];
        expect(claimTx)
          .to.emit(airdrop, "Claimed")
          .withArgs(claim.index, user1.address, claim.amount);
      });

      it("transfers tokens to the user account", async () => {
        const claim = merkleTree.claims[user1.address];
        expect(await token.balanceOf(user1.address)).to.eq(claim.amount);
      });

      // i know that this is a weird sentence
      it("shows that a claimed claim is claimed", async () => {
        const claim = merkleTree.claims[user1.address];

        expect(await airdrop.isClaimed(claim.index)).to.be.true;
      });

      // i know that this is a weird sentence
      it("shows the an unclaimed claim is unclaimed", async () => {
        const claim = merkleTree.claims[user2.address];

        expect(await airdrop.isClaimed(claim.index)).to.be.false;
      });
    });

    describe("claiming for others", () => {
      it("allows another user to redeem an airdrop for a user", async () => {
        const claim = merkleTree.claims[user2.address];

        await airdrop.claim(
          claim.index,
          user2.address,
          claim.amount,
          claim.proof
        );

        expect(await token.balanceOf(user2.address)).to.eq(claim.amount);
      });
    });

    describe("exceptions", () => {
      it("doesn't allow a user to claim twice", async () => {
        const claim = merkleTree.claims[user2.address];

        await expect(
          airdrop.claim(claim.index, user2.address, claim.amount, claim.proof)
        ).to.be.revertedWith("Tokens already claimed.");
      });

      it("doesn't allow a user to claim and take another users tokens", async () => {
        const claim = merkleTree.claims[user3.address];

        await expect(
          airdrop.claim(claim.index, user2.address, claim.amount, claim.proof)
        ).to.be.revertedWith("MerkleDistributor: Invalid proof");
      });

      it("doesn't allow a user to alter the amount of tokens", async () => {
        const claim = merkleTree.claims[user3.address];

        await expect(
          airdrop.claim(
            claim.index,
            user3.address,
            (Number(claim.amount) * 10).toString(),
            claim.proof
          )
        ).to.be.revertedWith("MerkleDistributor: Invalid proof");
      });
    });
  });

  //end
});
