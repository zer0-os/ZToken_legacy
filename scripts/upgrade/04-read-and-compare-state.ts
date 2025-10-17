import * as hre from "hardhat";
import * as fs from "fs";
import { readCompareState } from "../../test/helpers/read-compare-state";

/**
 * Script 04: Read and Compare Contract State (Post-Upgrade)
 *
 * This script reads the current contract state after an upgrade and compares it
 * with the pre-upgrade state captured by script 03. This ensures that the upgrade
 * process preserved all existing data and didn't introduce any storage corruption.
 *
 * Purpose:
 * - Read current (post-upgrade) contract state
 * - Compare with pre-upgrade state from script 03
 * - Validate that upgrade preserved data integrity
 * - Generate comparison report
 *
 * Workflow Position:
 * 1. Script 03: Capture pre-upgrade state
 * 2. Perform contract upgrade
 * 3. THIS SCRIPT: Compare post-upgrade state with pre-upgrade baseline
 *
 * Environment Variables Required:
 * - TOKEN_ADDRESS: Address of the upgraded ZeroDAOToken contract
 *
 * Prerequisites:
 * - Pre-upgrade state file must exist (created by script 03)
 * - Contract upgrade must have been completed
 *
 * Output:
 * - Creates a JSON file with comparison results: `04-read-and-compare-state-${network}.json`
 * - Throws error if state differences are detected
 *
 * @throws Error if pre-upgrade state file is not found
 * @throws Error if storage comparison fails (indicates upgrade corruption)
 */
const main = async () => {
  const [creator] = await hre.ethers.getSigners();
  const outputFile = `04-read-and-compare-state-${hre.network.name}.json`;

  // Find the pre-upgrade state file created by script 03
  const files = fs.readdirSync(".");
  const preUpgradeFile = files.find(
    (file) => file.startsWith("03-read-state-") && file.endsWith(".json")
  );

  if (!preUpgradeFile) {
    throw new Error(
      'Pre-upgrade state file not found. Expected file starting with "03-read-state-". Please run script 03 first.'
    );
  }

  const preUpgradeState = JSON.parse(fs.readFileSync(preUpgradeFile, "utf8"));

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) {
    throw Error("No token address present in env");
  }

  // Read current state and compare with pre-upgrade state
  await readCompareState(
    creator,
    tokenAddress,
    preUpgradeState,
    outputFile,
    true
  );
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });
