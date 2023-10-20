import * as hre from "hardhat";
import { MeowToken, ZeroToken } from "../typechain";
import { getLogger } from "../utilities";
import { impersonate } from "../test/helpers";
import { assert } from "console";
import { connect } from "http2";
import fs from "fs";
import { transfer, TransferType } from "./helpers";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { BigNumber } from "ethers";

const logger = getLogger("scripts::deployZERO");

const sepoliaTokenAddress = "0x1A9A8894bc8611a39c7Ed690AED71b7918995F14";
const mainnetTokenAddress = "0x0eC78ED49C2D27b315D462d43B5BAB94d2C79bf8";

// Change if post upgrade
const preUpgradeTokenName = "ZeroToken";
const postUpgradeTokenName = "MeowToken";


// Collect values for balance and allowance from several users
// Run this script both before and after the upgrade to verify values are expected
export async function meowTest(
  users ?: Array<SignerWithAddress>,
  tokenAddress ?: string,
  amount : BigNumber
) {
  logger.log(`Confirm transfer, transferBulk, transferFromBulk, and allowances`);

  let actualTokenAddress = tokenAddress;
  if (!actualTokenAddress) {
    actualTokenAddress = hre.network.name == "sepolia"
      ? sepoliaTokenAddress
      : mainnetTokenAddress;
  }

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

  const tokenFactory = await hre.ethers.getContractFactory(preUpgradeTokenName, deployer);

  const token = tokenFactory.attach(actualTokenAddress);

  let writeObject = {
    network: hre.network.name,
    tokenAddress: actualTokenAddress,
  };

  // Call helper
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

  // TODO if run post upgrade also add transfer to token address for burn
  fs.writeFileSync("tokenValues.json", JSON.stringify(writeObject, undefined, 2),"utf-8");
}

const tryMeowTest = async () => {
  await meowTest();
}

tryMeowTest();
