import { deployZero } from "./01_deployZero";
import * as hre from "hardhat";
import { deployMeowImpl } from "./02_deployMeowImpl";
import { meowTest } from "./03a_confirmValues";
import { upgradeToken } from "./03b_upgradeZero";


async function runTestnetUpgrade() {
  const zeroToken = await deployZero();

  // Will be astro, maintest, test1, and test2 accounts
  const [
    deployer,
    userA,
    userB,
    userC,
    userD
  ] = await hre.ethers.getSigners();

  const approvedAmt = hre.ethers.utils.parseEther("2.37954");

  await zeroToken.connect(userC).approve(userD.address, approvedAmt);

  await deployMeowImpl();

  await meowTest([
    deployer,
    userA,
    userB,
    userC,
  ],
    zeroToken.address
  );

  const meowToken = await upgradeToken(zeroToken.address);

  await meowTest([
    deployer,
    userA,
    userB,
    userD,
  ],
    meowToken.address
  );
}

runTestnetUpgrade()
  .then(
    () => process.exit(0)
  ).catch(
  (error) => {
    console.error(error);
    process.exit(1);
  }
);
