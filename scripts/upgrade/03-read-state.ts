import * as hre from "hardhat";
import { readState } from "../../test/helpers/read-state";
import { ZeroDAOToken__factory } from "../../typechain";

/**
 * Script 03: Read Contract State (Pre-Upgrade)
 * 
 * This script reads and captures the current state of the ZeroDAOToken contract
 * before performing an upgrade. This creates a baseline snapshot that can be
 * compared against the post-upgrade state to ensure data integrity.
 * 
 * Purpose:
 * - Capture contract storage state before upgrade
 * - Create a reference point for state comparison
 * - Ensure upgrade doesn't corrupt existing data
 * 
 * Usage Pattern:
 * 1. Run this script BEFORE upgrade (captures pre-upgrade state)
 * 2. Perform the contract upgrade
 * 3. Run script 04 to compare pre/post upgrade states
 * 
 * Environment Variables Required:
 * - TOKEN_ADDRESS: Address of the deployed ZeroDAOToken contract
 * 
 * Output:
 * - Creates a JSON file with contract state: `03-read-state-${network}.json`
 * 
 * @note This script should be executed twice in the upgrade workflow:
 *       once BEFORE upgrading and once AFTER upgrading (via script 04)
 */
const main = async () => {
  const [creator] = await hre.ethers.getSigners();
  const outputFile = `03-read-state-v1-to-v2-${hre.network.name}.json`;

  // Get the token address from initial deployment in step 1
  let tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw Error("No token address present in env");
  }

  // Read and save current contract state
  await readState(
    creator,
    tokenAddress,
    outputFile,
    false
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });
