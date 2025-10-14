import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers } from "hardhat";
import {
  ERC20Mock,
  ERC20Mock__factory,
  ZeroDAOTokenV2__factory,
  ZeroDAOTokenV2,
} from "../typechain";

import * as hre from "hardhat";
import { compareStorageData, ContractStorageData, readContractStorage } from "../scripts/utils/storage-check";
import { deployFundTransfer } from "./helpers/deploy-fund-transfer";

/**
 * Unit test new functionality not already tested in the orginal contract
 */
describe("zDAOTokenV2 Test", () => {
  let creator: SignerWithAddress;

  let userA: SignerWithAddress;
  let userB: SignerWithAddress;

  // let zeroDAOToken: ZeroDAOToken;
  let zeroDAOTokenV2: ZeroDAOTokenV2;
  let mockToken: ERC20Mock;

  // Update as needed for testing
  const decimals = 6;
  const testTokenAmount = ethers.utils.parseUnits("500000", decimals);

  before(async () => {
    [creator, userA, userB] = await ethers.getSigners();

    zeroDAOTokenV2 = await hre.upgrades.deployProxy(
      new ZeroDAOTokenV2__factory(creator),
      [
        "Test WILD",
        "tWILD"
      ]
    ) as ZeroDAOTokenV2;

    const mockTokenFactory = new ERC20Mock__factory(creator);
    mockToken = await mockTokenFactory.deploy("Test Mock Token", "TMT");
    await mockToken.deployed();

    // Give test balance to contract
    await mockToken.mint(zeroDAOTokenV2.address, testTokenAmount);
  });

  it("calls withdrawERC20 to withdraw a specific amount to an EOA", async () => {
    const initialRecipientBalance = await mockToken.balanceOf(userA.address);
    const initialContractBalance = await mockToken.balanceOf(zeroDAOTokenV2.address);

    // Call withdrawERC20 function - use creator since they own the contract
    // Use exact amount the contract has on it as a parameter
    const tx = zeroDAOTokenV2.connect(creator).withdrawERC20(
      mockToken.address,
      userA.address,
      initialContractBalance
    );

    // Verify the transaction emitted the correct event
    await expect(tx)
      .to.emit(zeroDAOTokenV2, "ERC20TokenWithdrawn")
      .withArgs(mockToken.address, userA.address, testTokenAmount);

    // Check contract balance (should be 0)
    const finalContractBalance = await mockToken.balanceOf(zeroDAOTokenV2.address);
    expect(finalContractBalance).to.eq(initialContractBalance.sub(testTokenAmount));

    // Check recipient balance (should have received the tokens)
    const finalRecipientBalance = await mockToken.balanceOf(userA.address);
    expect(finalRecipientBalance).to.eq(initialRecipientBalance.add(testTokenAmount));
  });

  it("tests withdrawERC20 with amount 0 (withdraw all)", async () => {
    // First, give the contract some more tokens
    const additionalAmount = ethers.utils.parseUnits("100000", decimals);
    await mockToken.connect(creator).mint(zeroDAOTokenV2.address, additionalAmount);

    const contractBalanceBefore = await mockToken.balanceOf(zeroDAOTokenV2.address);
    const userBalanceBefore = await mockToken.balanceOf(userB.address);

    // Call withdrawERC20 with amount 0 (withdraw all)
    const tx = zeroDAOTokenV2.connect(creator).withdrawERC20(
      mockToken.address,
      userB.address,
      0
    );

    // Verify the transaction emitted the correct event with the full amount
    await expect(tx)
      .to.emit(zeroDAOTokenV2, "ERC20TokenWithdrawn")
      .withArgs(mockToken.address, userB.address, additionalAmount);

    // Check final balances
    const contractBalanceAfter = await mockToken.balanceOf(zeroDAOTokenV2.address);
    const userBalanceAfter = await mockToken.balanceOf(userB.address);

    // Confirm it drained the contract
    expect(contractBalanceAfter).to.eq(0);
    expect(contractBalanceAfter).to.eq(contractBalanceBefore.sub(additionalAmount));
    expect(userBalanceAfter).to.eq(userBalanceBefore.add(additionalAmount));
  });

  it("Fails when called by non-owner", async () => {
    // Give the contract some tokens first
    await mockToken.connect(creator).mint(zeroDAOTokenV2.address, testTokenAmount);

    // Try to call withdrawERC20 from non-owner account (creator is not the owner, creator is)
    await expect(
      zeroDAOTokenV2.connect(userA).withdrawERC20(
        mockToken.address,
        creator.address,
        testTokenAmount
      )
    ).to.be.revertedWith("Ownable: caller is not the owner");
  });

  it("Fails when token or recipient address is zero", async () => {
    // Test zero token address - use creator since they own the contract
    await expect(
      zeroDAOTokenV2.connect(creator).withdrawERC20(
        ethers.constants.AddressZero,
        userA.address,
        testTokenAmount
      )
    ).to.be.revertedWith("zDAOToken: Token address cannot be zero");

    // Test zero recipient address - use creator since they own the contract
    await expect(
      zeroDAOTokenV2.connect(creator).withdrawERC20(
        mockToken.address,
        ethers.constants.AddressZero,
        testTokenAmount
      )
    ).to.be.revertedWith("zDAOToken: Recipient address cannot be zero");
  });

  it("Fails when contract has insufficient token balance", async () => {
    // First, withdraw any remaining amount to ensure the following call fails correctly
    await zeroDAOTokenV2.connect(creator).withdrawERC20(
      mockToken.address,
      creator.address,
      0
    );

    await expect(
      zeroDAOTokenV2.connect(creator).withdrawERC20(
        mockToken.address,
        userA.address,
        testTokenAmount
      )
    ).to.be.revertedWith("ERC20: transfer amount exceeds balance");
  });
});