import * as hre from "hardhat";
import {
  MerkleVestingDeploymentParams,
  doDeployVesting,
} from "../../tasks/deploy";
import { getLogger } from "../../utilities";

const logger = getLogger("scripts::deployVesting");

/**
 * This is an example of how to deploy via a script.
 * This isn't recommended, instead you should use the cli 'yarn hardhat deploy vesting'
 */

async function main() {
  await hre.run("compile");

  logger.log("programmatically deploying vesting contract");

  logger.log(`Deploying to ${hre.network.name}`);

  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  logger.log(
    `'${deploymentAccount.address}' will be used as the deployment account`
  );

  const params: MerkleVestingDeploymentParams = {
    token: "0x59b670e9fA9D0A427751Af201D676719a970857b",
    merkleRoot:
      "0x6e5b3877dc2af6fa275f85de82e2eb9b925b5b1642edaa4ace8a1dccf6e60301",
    startBlock: 13214124,
    cliff: 10000,
    duration: 500000,
    merkleFile: "some file",
  };

  await doDeployVesting(hre, deploymentAccount, params, "v2");
}

main();
