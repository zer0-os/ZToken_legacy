/* eslint-disable */
import * as hre from "hardhat";
import { MeowToken, ZeroToken } from "../typechain";
import { getLogger } from "../utilities";
import fs from "fs";
import { preUpgradeFilename, postUpgradeFilename, transfer, TransferType } from "./helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";
import { deployZero } from "./01_deployZero";

const logger = getLogger("scripts::confirmValues");

const sepoliaTokenAddress = "0x0Ab90E0aBca23FdB5e7f447628C6f2BFDB4dE0D0"; // 10/23/2023
const mainnetTokenAddress = "0x0eC78ED49C2D27b315D462d43B5BAB94d2C79bf8";

// Change if post upgrade
const preUpgradeTokenName = "ZeroToken";
const postUpgradeTokenName = "MeowToken";

// Collect values for balance and allowance from several users
// Run this script both before and after the upgrade to verify values are expected
export async function contractTest(
  amount : BigNumber,
  outputFilename : string,
  tokenName : string,
  tokenAddress : string,
  users ?: Array<SignerWithAddress>,
): Promise<void> {
  logger.log(`Confirm transfer, transferBulk, transferFromBulk, and allowances`);

  let deployer, userA, userB, userC;
  if (!users) {
    // Will be astro, maintest, test1, and test2 accounts
    [
      deployer,
      userA,
      userB,
      userC
    ] = await hre.ethers.getSigners();
  } else {
    [
      deployer,
      userA,
      userB,
      userC
    ] = users;
  }

  logger.log(`Deployer: ${deployer.address}`);
  logger.log(`UserA: ${userA.address}`);
  logger.log(`UserB: ${userB.address}`);
  logger.log(`UserC: ${userC.address}`);

  logger.log(`Running tests for token: ${tokenName}`);
  const tokenFactory = await hre.ethers.getContractFactory(tokenName, deployer);

  const token = tokenFactory.attach(tokenAddress) as ZeroToken | MeowToken

  let writeObject = {
    network: hre.network.name,
    tokenAddress: tokenAddress,
  };

  // Call helper
  writeObject = await transfer(
    writeObject,
    [
      deployer,
      userA,
      userB,
      userC,
    ],
    amount,
    token,
    TransferType.transfer
  );

  writeObject = await transfer(
    writeObject,
    [
      deployer,
      userA,
      userB,
      userC
    ],
    amount,
    token,
    TransferType.transferFrom
  );

  logger.log(`Writing to file: ${outputFilename}`);
  fs.writeFileSync(outputFilename, JSON.stringify(writeObject, undefined, 2),"utf-8");
}

// If running as it's own script, will run through the below command
// Otherwise it will run as part of `00_main.ts` flow
const executeContractTest = async () => {
  const amount = hre.ethers.utils.parseEther("1");
  let tokenAddress;
  if(hre.network.name === "hardhat") {
    // const token = await deployZero();
    // tokenAddress = token.address;
  } else {
    tokenAddress = hre.network.name === "sepolia" ? sepoliaTokenAddress : mainnetTokenAddress;
  }

  logger.log(`Token address: ${tokenAddress}`);

  await contractTest(
    amount,
    preUpgradeFilename, // change to `postUpgradeFileName` when using for after the upgrade
    preUpgradeTokenName, // change to `postUpgradeTokenName` when using for after the upgrade
    tokenAddress!
  );
  // Uncomment and run the below instead when using for aftter the upgrades
  // await contractTest(amount, postUpgradeFilename, tokenAddress);
}

executeContractTest().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});