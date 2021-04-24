import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";

import * as fs from "fs";
import { MerkleDistributorInfo } from "../utilities/createMerkle";
import { MerkleTokenVesting } from "../typechain/MerkleTokenVesting";
import { MerkleTokenVesting__factory } from "../typechain/factories/MerkleTokenVesting__factory";
import { ZDAOToken } from "../typechain/ZDAOToken";
import { ZDAOToken__factory } from "../typechain/factories/ZDAOToken__factory";

chai.use(solidity);
const { expect } = chai;

const merkleTreeFilePath = "./test/resources/testMerkle.json";

describe("End 2 End Tests - Merkle Token Vesting", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: ZDAOToken;
  let merkleVesting: MerkleTokenVesting;

  let merkleTree: MerkleDistributorInfo;

  let vestingStartBlock: number;
  const vestingStartDelay = 100; // 100 blocks from start
  const vestingCliff = 100; // 100 blocks
  const vestingDuration = 1000; // 1000 blocks

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
      const tokenFactory = new ZDAOToken__factory(creator);

      // In non-test environments this needs to be done using the oz upgrade library
      token = await tokenFactory.deploy();
      await token.initialize("WILDER TEST", "WLD");
    });

    it("deploys a merkle token vesting contract", async () => {
      const vestingFactory = new MerkleTokenVesting__factory(creator);

      // In non-test environments this needs to be done using the oz upgrade library
      merkleVesting = await vestingFactory.deploy();

      vestingStartBlock = ethers.provider.blockNumber + vestingStartDelay;

      await merkleVesting.initialize(
        vestingStartBlock,
        vestingCliff,
        vestingDuration,
        token.address,
        merkleTree.merkleRoot
      );
    });
  });

  describe("minting tokens for vesting", () => {
    it("allows the token owner to mint the vesting contract tokens", async () => {
      await token.mint(merkleVesting.address, merkleTree.tokenTotal);

      expect(await token.balanceOf(merkleVesting.address)).to.eq(
        merkleTree.tokenTotal
      );
    });
  });

  describe("claiming token vesting awards", () => {
    it("allows user1 to claim an award", async () => {
      const vestingAsUser1 = merkleVesting.connect(user1);

      const claim = merkleTree.claims[user1.address];

      const tx = await vestingAsUser1.claimAward(
        claim.index,
        user1.address,
        claim.amount,
        claim.revocable,
        claim.proof
      );

      expect(tx)
        .to.emit(merkleVesting, "Claimed")
        .withArgs(claim.index, user1.address, claim.amount, claim.revocable);
    });

    it("allows user1 to claim user2's award for user2", async () => {
      const vestingAsUser1 = merkleVesting.connect(user1);

      const claim = merkleTree.claims[user2.address];

      const tx = await vestingAsUser1.claimAward(
        claim.index,
        user2.address,
        claim.amount,
        claim.revocable,
        claim.proof
      );

      expect(tx)
        .to.emit(merkleVesting, "Claimed")
        .withArgs(claim.index, user2.address, claim.amount, claim.revocable);
    });

    it("prevents user1 from claiming user3's award for themselves", async () => {
      const vestingAsUser1 = merkleVesting.connect(user1);

      const claim = merkleTree.claims[user3.address];

      const tx = vestingAsUser1.claimAward(
        claim.index,
        user1.address,
        claim.amount,
        claim.revocable,
        claim.proof
      );

      await expect(tx).to.be.revertedWith("MerkleTokenVesting: Invalid proof.");
    });

    it("prevents user1 from claiming their reward twice", async () => {
      const vestingAsUser1 = merkleVesting.connect(user1);

      const claim = merkleTree.claims[user1.address];

      const tx = vestingAsUser1.claimAward(
        claim.index,
        user1.address,
        claim.amount,
        claim.revocable,
        claim.proof
      );

      await expect(tx).to.be.revertedWith(
        "MerkleTokenVesting: Award already claimed."
      );
    });

    it("returns true that user1 has claimed their award", async () => {
      const claim = merkleTree.claims[user1.address];

      expect(await merkleVesting.isClaimed(claim.index)).to.be.true;
    });

    it("returns false that user3 has claimed their award", async () => {
      const claim = merkleTree.claims[user3.address];

      expect(await merkleVesting.isClaimed(claim.index)).to.be.false;
    });
  });

  describe("vesting tokens", () => {
    it("shows that user1 has no vested tokens before vesting has started", async () => {
      // if this expect fails then please increase `vestingStartDelay`
      expect(ethers.provider.blockNumber).to.be.lessThan(vestingStartBlock);

      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(0);
    });

    it("shows that 'getVestedAmount' and 'getReleasableAmount' are the same when no tokens for user1 have been released", async () => {
      // todo, need to skip blocks
    });
  });

  // end
});
