import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/dist/src/signer-with-address";
import { ethers } from "hardhat";

import chai from "chai";
import { solidity } from "ethereum-waffle";

import * as fs from "fs";
import { MerkleDistributorInfo } from "../utilities/vesting/createMerkle";
import { MerkleTokenVesting } from "../typechain/contracts/MerkleTokenVesting";
import { MerkleTokenVesting__factory } from "../typechain/factories/contracts/MerkleTokenVesting__factory";
import { ZeroToken, ZeroToken__factory } from "../typechain";
import { BigNumber } from "@ethersproject/bignumber";
import { ContractTransaction } from "ethers";

chai.use(solidity);
const { expect } = chai;

/**
 * Depends on this JSON file for testing.
 * Please do not change values in this JSON file unless you intend to change tests to match.
 */
const merkleTreeFilePath = "./test/resources/vesting/testMerkle.json";

describe("End 2 End Tests - Merkle Token Vesting", () => {
  let accounts: SignerWithAddress[];

  let creator: SignerWithAddress;

  let user1: SignerWithAddress;
  let user2: SignerWithAddress;
  let user3: SignerWithAddress;

  let token: ZeroToken;
  let merkleVesting: MerkleTokenVesting;

  let merkleTree: MerkleDistributorInfo;

  let vestingStartBlock: number;
  const vestingStartDelay = 10; // blocks from start
  const vestingCliff = 10; // blocks
  const vestingDuration = 100; // blocks
  //const vestPercentPerBlock = 1.0 / vestingDuration;

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

    it("deploys a merkle token vesting contract", async () => {
      const vestingFactory = new MerkleTokenVesting__factory(creator);

      // In non-test environments this needs to be done using the oz upgrade library
      // which will do deployment + initialization all in one transaction
      // doing them in two transactions like this is dangerous
      merkleVesting = await vestingFactory.deploy();
    });

    it("prevents initialization of the cliff being after the duration", async () => {
      vestingStartBlock = ethers.provider.blockNumber + vestingStartDelay;

      await expect(
        merkleVesting.initialize(
          vestingStartBlock,
          vestingDuration + vestingCliff,
          vestingDuration,
          token.address,
          merkleTree.merkleRoot
        )
      ).to.be.revertedWith("Cliff must be less than duration");
    });

    it("initializes the token vesting contract", async () => {
      vestingStartBlock = ethers.provider.blockNumber + vestingStartDelay;

      await merkleVesting.initialize(
        vestingStartBlock,
        vestingCliff,
        vestingDuration,
        token.address,
        merkleTree.merkleRoot
      );
    });

    it("does not allow a second initialization", async () => {
      vestingStartBlock = ethers.provider.blockNumber + vestingStartDelay;

      await expect(
        merkleVesting.initialize(
          vestingStartBlock,
          vestingCliff,
          vestingDuration,
          token.address,
          merkleTree.merkleRoot
        )
      ).to.be.revertedWith("Initializable: contract is already initialized");
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

      await expect(tx).to.be.revertedWith("MerkleDistributor: Invalid proof");
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

      await expect(tx).to.be.revertedWith("Award already claimed");
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

    it("does not vest before the cliff", async () => {
      while (
        (await ethers.provider.getBlockNumber()) <
        vestingStartBlock + vestingCliff - 1
      ) {
        await ethers.provider.send("evm_mine", []);
      }

      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(0);
    });

    it("shows proper amount when cliff is reached", async () => {
      while (
        (await ethers.provider.getBlockNumber()) <
        vestingStartBlock + vestingCliff
      ) {
        await ethers.provider.send("evm_mine", []);
      }

      // Calculated from merkle tree
      // user1 is awarded 1000000
      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(100000);
    });

    it("shows that 'getVestedAmount' and 'getReleasableAmount' are the same when no tokens have been released", async () => {
      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(
        await merkleVesting.getReleasableAmount(user1.address)
      );
    });

    let user1ReleasedTokens: BigNumber;

    it("releases the expected amount of tokens to user1", async () => {
      user1ReleasedTokens = await merkleVesting.getReleasableAmount(
        user1.address
      );

      // When they actually release they will get slightly more because the block number is incremented
      user1ReleasedTokens = user1ReleasedTokens.add(
        user1ReleasedTokens.div(10)
      );

      const tx = await merkleVesting.release(user1.address);

      expect(tx)
        .to.emit(merkleVesting, "Released")
        .withArgs(user1.address, user1ReleasedTokens);
    });

    it("user1 has tokens according to the ERC20 contract", async () => {
      expect(await token.balanceOf(user1.address)).to.eq(user1ReleasedTokens);
    });

    it("vests at the proper rate", async () => {
      while (
        (await ethers.provider.getBlockNumber()) <
        vestingStartBlock + vestingDuration / 2
      ) {
        await ethers.provider.send("evm_mine", []);
      }

      // Calculated from merkle tree
      // user1 is awarded 1000000 in total
      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(500000);
    });

    it("shows that a user who hasn't claimed their award has no vesting tokens", async () => {
      expect(await merkleVesting.getVestedAmount(user3.address)).to.eq(0);
    });

    it("shows proper vesting amount after claiming", async () => {
      const claim = merkleTree.claims[user3.address];

      await merkleVesting.claimAward(
        claim.index,
        user3.address,
        claim.amount,
        claim.revocable,
        claim.proof
      );

      // user3 was awarded 5000000 in total
      expect(await merkleVesting.getVestedAmount(user3.address)).to.eq(2550000);
    });
  });

  describe("revoke vesting", () => {
    let revokeTx: ContractTransaction;

    it("allows the owner to revoke an award", async () => {
      revokeTx = await merkleVesting.revoke(user2.address);
    });

    it("emits a Revoked event with arguments when revoking", async () => {
      expect(revokeTx)
        .to.emit(merkleVesting, "Revoked")
        .withArgs(user2.address, 480000);
    });

    it("emits a Released event with arguments when revoking", async () => {
      expect(revokeTx)
        .to.emit(merkleVesting, "Released")
        .withArgs(user2.address, 520000);
    });

    it("releases vested tokens to the beneficiary on revoke", async () => {
      expect(await token.balanceOf(user2.address)).to.eq(520000);
    });

    it("refunds un vested tokens back to the vesting contract owner on revoke", async () => {
      expect(await token.balanceOf(creator.address)).to.eq(480000);
    });

    it("does not allow a non-owner to revoke an award", async () => {
      const merkleAsUser3 = await merkleVesting.connect(user3);
      await expect(merkleAsUser3.revoke(user1.address)).to.be.revertedWith(
        "Ownable: caller is not the owner"
      );
    });

    it("does not allow a non-revocable award to be revoked", async () => {
      await expect(merkleVesting.revoke(user1.address)).to.be.revertedWith(
        "Cannot be revoked"
      );
    });

    it("does not allow a revoked award to be revoked twice", async () => {
      await expect(merkleVesting.revoke(user2.address)).to.be.revertedWith(
        "Already revoked"
      );
    });

    it("shows vested amount as the released amount when an award has been revoked", async () => {
      expect(await merkleVesting.getVestedAmount(user2.address)).to.eq(520000);
    });

    it("shows releasable amount as zer0 when an award has been revoked", async () => {
      expect(await merkleVesting.getReleasableAmount(user2.address)).to.eq(0);
    });

    it("does not continue to vest tokens after revocation", async () => {
      await ethers.provider.send("evm_mine", []);

      expect(await merkleVesting.getReleasableAmount(user2.address)).to.eq(0);
    });

    it("does not allow a user to release more tokens after revocation", async () => {
      await ethers.provider.send("evm_mine", []);

      await expect(merkleVesting.release(user2.address)).to.be.revertedWith(
        "Nothing to release"
      );
    });

    it("does not allow a user to reclaim an award after revocation", async () => {
      const claim = merkleTree.claims[user2.address];

      const tx = merkleVesting.claimAward(
        claim.index,
        user2.address,
        claim.amount,
        claim.revocable,
        claim.proof
      );

      await expect(tx).to.be.revertedWith("Award already claimed");
    });
  });

  describe("end of vesting tokens", () => {
    it("allows release of all tokens after the end of duration", async () => {
      while (
        (await ethers.provider.getBlockNumber()) <
        vestingStartBlock + vestingDuration
      ) {
        await ethers.provider.send("evm_mine", []);
      }

      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(1000000);
    });

    it("doesn't vest extra tokens past the end", async () => {
      await ethers.provider.send("evm_mine", []);

      expect(await merkleVesting.getVestedAmount(user1.address)).to.eq(1000000);
    });

    let finalReleaseTx: ContractTransaction;
    it("only releases the max amount of tokens", async () => {
      await ethers.provider.send("evm_mine", []);

      finalReleaseTx = await merkleVesting.release(user1.address);

      expect(finalReleaseTx)
        .to.emit(merkleVesting, "Released")
        .withArgs(user1.address, 890000);
    });

    it("shows proper balance of tokens in user wallet after final vest", async () => {
      expect(await token.balanceOf(user1.address)).to.eq(1000000);
    });

    it("does not allow a user to release more tokens after end of vesting", async () => {
      await ethers.provider.send("evm_mine", []);

      await expect(merkleVesting.release(user1.address)).to.be.revertedWith(
        "Nothing to release"
      );
    });
  });

  // end
});
