import * as hre from "hardhat";
import { deployZero } from "./01_deployZero";
import { contractTest } from "./03_confirmValues";
import { upgradeToken } from "./04_upgradeZero";
import {
  preUpgradeFilename,
  postUpgradeFilename
} from "./helpers";

async function runTestnetUpgrade() {
  // 1. Deploy ZeroToken
  const zeroToken = await deployZero();

  // Will be astro, maintest, test1, and test2 accounts
  const [
    deployer,
    userA,
    userB,
    userC,
  ] = await hre.ethers.getSigners();

  const approvedAmount = hre.ethers.utils.parseEther("2.37954");

  // 2. Deploy MeowToken implementation contract
  // Not needed for testnet run, we simply upgrade from meow factory here
  // but on mainnet we will use Defender to vote for the proxy upgrade 
  // and have the implementation contract already deployed by this script
  // const meowImpl = await deployMeowImpl();

  // 3. Confirm values of ZERO before upgrade
  await contractTest(
    approvedAmount,
    preUpgradeFilename,
    "ZeroToken",
    zeroToken.address,
    [
      deployer,
      userA,
      userB,
      userC,
    ],
  );

  const meowToken = await upgradeToken(zeroToken.address);

  await contractTest(
    approvedAmount,
    postUpgradeFilename,
    "MeowToken",
    meowToken.address,
    [
      deployer,
      userA,
      userB,
    ],
  );
}

runTestnetUpgrade()

