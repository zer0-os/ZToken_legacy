import * as hre from "hardhat";
import { deployFundTransfer } from "../../test/helpers/deploy-fund-transfer";
import { DEFAULT_MOCK_TOKEN_AMOUNT, DEFAULT_MOCK_TOKEN_DECIMALS } from "../../test/helpers/constants";

/**
 * Script 01: Deploy V1 Token Contract
 * 
 * This script performs the initial setup for testing the WILD token upgrade process.
 * It serves as the first step in a multi-step upgrade testing workflow.
 * 
 * Operations performed:
 * - Deploy the ZeroDAOToken (V1) as an upgradeable proxy
 * - Deploy an ERC20Mock token for testing purposes
 * - Mint mock tokens to the ZeroDAOToken contract
 * - Transfer ownership of both the Proxy and ProxyAdmin to a specified address
 * 
 * Environment Variables Required:
 * - OWNER_ADDRESS: The address to transfer ownership to (optional for hardhat network)
 * 
 * Output:
 * - Creates a JSON file with deployment details: `01-deploy-v1-${network}.json`
 */
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();
  const outputFile = `01-deploy-v1-${hre.network.name}.json`;

  // The address of the new owner to be transferred to for WILD as well as ProxyAdmin
  // If not using hardhat, this should be a Safe address
  let newOwnerAddress = process.env.OWNER_ADDRESS;

  if (!newOwnerAddress) {
    throw new Error("No address given for transfer ownership call");
  }

  const amount = hre.ethers.utils.parseUnits(
    DEFAULT_MOCK_TOKEN_AMOUNT,
    DEFAULT_MOCK_TOKEN_DECIMALS
  );

  // Deploy V1 token contract with mock token for testing
  await deployFundTransfer(
    deployer,
    newOwnerAddress,
    outputFile,
    amount,
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
