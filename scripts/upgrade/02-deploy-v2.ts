import * as hre from "hardhat";
import { deployV2 } from "../../test/helpers/deploy-v2";

/**
 * Script 02: Deploy V2 Implementation Contract
 * 
 * This script deploys the ZeroDAOTokenV2 implementation contract that will be used
 * for upgrading the existing V1 proxy contract. This is step 2 in the upgrade process.
 * 
 * Note: This only deploys the implementation contract, not a proxy. The actual upgrade
 * happens separately using the proxy upgrade mechanism.
 * 
 * Operations performed:
 * - Deploy ZeroDAOTokenV2 implementation contract
 * - Save deployment details to output file
 * 
 * Prerequisites:
 * - V1 contract should already be deployed (from script 01)
 * - Deployer account should have sufficient funds for deployment
 * 
 * Output:
 * - Creates a JSON file with implementation address: `02-deploy-v2-${network}.json`
 * 
 * Production Notes:
 * - Ensure proper addresses are configured
 * - Deployer account needs funds for deployment
 * - For mainnet, proposer should be configured on Safe multisig
 */
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();
  const outputFile = `02-deploy-v2-${hre.network.name}.json`;

  // Deploy V2 implementation contract
  await deployV2(
    deployer,
    outputFile
  )
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });
