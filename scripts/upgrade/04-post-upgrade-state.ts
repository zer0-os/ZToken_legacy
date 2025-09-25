import * as hre from "hardhat";
import { readContractStorage, compareStorageData } from "../utils/storage-check";
import { ZeroDAOTokenV2__factory } from "../../typechain";

import * as fs from "fs";
import * as path from "path";



// To be executed AFTER the upgrade from the Safe
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();
  const outputFile = `04-post-upgrade-state-${hre.network.name}-${Date.now()}.json`;

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) throw Error("No token address present in env");

  const tokenFactory = new ZeroDAOTokenV2__factory(deployer);
  const token = tokenFactory.attach(tokenAddress);

  const postUpgradeState = await readContractStorage(
    tokenFactory,
    token
  );

  fs.writeFileSync(`04-post-upgrade-state-${hre.network.name}.json`, JSON.stringify(postUpgradeState, undefined, 2));

  // Now compare pre and post upgrade state by
  // reading the `03-pre-upgrade-state-sepolia.json`
  // and calling to `compareStorageData` for both

  // Find the pre-upgrade state file
  const files = fs.readdirSync('.');
  const preUpgradeFile = files.find(file => file.startsWith('03-read-state-') && file.endsWith('.json'));

  if (!preUpgradeFile) {
    throw new Error('Pre-upgrade state file not found. Expected file starting with "03-pre-upgrade-state-"');
  }

  console.log(`Reading pre-upgrade state from: ${preUpgradeFile}`);
  const preUpgradeState = JSON.parse(fs.readFileSync(preUpgradeFile, 'utf8'));

  console.log('Comparing pre and post upgrade states...');
  try {
    compareStorageData(preUpgradeState, postUpgradeState);
    console.log('Storage comparison passed - no differences found');
  } catch (error) {
    console.error('Storage comparison failed:', error);
    throw error;
  }
}

main();
