import * as hre from "hardhat";
import *  as fs from "fs";
import { assert } from "console";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getLogger } from "../../utilities";
import { ZeroDAOToken, ZeroDAOToken__factory, ERC20Mock__factory } from "../../typechain";
import {
  DEFAULT_ZERO_TOKEN_NAME,
  DEFAULT_ZERO_TOKEN_SYMBOL,
  DEFAULT_MOCK_TOKEN_NAME,
  DEFAULT_MOCK_TOKEN_SYMBOL,
  DEFAULT_MOCK_TOKEN_AMOUNT,
  DEFAULT_MOCK_TOKEN_DECIMALS,
  HARDHAT_NETWORK_NAME,
  DEPLOY_FUND_TRANSFER_LOGGER,
  TRANSFERRING_OWNERSHIP_MESSAGE,
  OWNERSHIP_TRANSFERRED_MESSAGE
} from "./constants";

/**
 * Deploy V1 Token Contract with Mock Token Setup
 * 
 * This function handles the complete deployment and setup of the V1 ZeroDAOToken
 * contract along with a mock ERC20 token for testing purposes. It's designed to
 * create a complete testing environment for the upgrade process.
 * 
 * @param creator - The signer account that will deploy the contracts
 * @param outputFile - Optional path to save deployment details as JSON
 * @param amount - Optional amount of mock tokens to mint (defaults to 500,000 with 6 decimals)
 * 
 * @returns Promise<ZeroDAOToken> - The deployed ZeroDAOToken contract instance
 * 
 * Operations performed:
 * 1. Deploy ZeroDAOToken V1 as an upgradeable proxy
 * 2. Transfer ownership of the token contract to specified address
 * 3. Transfer ownership of the proxy admin to specified address
 * 4. Deploy a mock ERC20 token for testing
 * 5. Mint mock tokens to the ZeroDAOToken contract
 * 6. Save deployment details to output file (if specified)
 * 
 * Environment Variables:
 * - OWNER_ADDRESS: Address to transfer ownership to (optional for hardhat)
 * 
 * @throws Error if OWNER_ADDRESS is not set for non-hardhat networks
 * @throws AssertionError if token minting fails
 */
export const deployFundTransfer = async (
  creator: SignerWithAddress,
  newOwnerAddress: string,
  outputFile?: string,
  amount?: number
): Promise<ZeroDAOToken> => {
  const logger = getLogger(DEPLOY_FUND_TRANSFER_LOGGER);

  const name = DEFAULT_ZERO_TOKEN_NAME;
  const symbol = DEFAULT_ZERO_TOKEN_SYMBOL;

  logger.info(`Network: ${hre.network.name}`);
  logger.info(`Deploying token: ${name} with symbol ${symbol}`);
  logger.info(`Deployer: ${creator.address}`);
  logger.info(`New owner will be: ${newOwnerAddress}`);

  // Deploy ZeroDaoTokenV1 and transfer ownership
  const factory = new ZeroDAOToken__factory(creator);
  const zeroDAOTokenV1 = await hre.upgrades.deployProxy(
    factory,
    [
      name,
      symbol
    ],
  ) as ZeroDAOToken;

  if (hre.network.name !== HARDHAT_NETWORK_NAME) {
    await zeroDAOTokenV1.deployed();
  }

  logger.info(TRANSFERRING_OWNERSHIP_MESSAGE);
  // Transfer ownership of contract itself
  await zeroDAOTokenV1["transferOwnership(address)"](newOwnerAddress);

  // Transfer ownership or proxy admin, if needed
  const proxyAdmin = await hre.upgrades.admin.getInstance();
  const owner = await proxyAdmin.owner();
  logger.info(`Current Proxy Admin owner: ${owner}`);

  if (owner !== newOwnerAddress && owner === creator.address) {
    logger.info(`Transferring Proxy Admin Ownership to ${newOwnerAddress}`);
    await proxyAdmin.transferOwnership(newOwnerAddress);
  }

  logger.info(`${name} token deployed to address: ${zeroDAOTokenV1.address}`);
  logger.info(OWNERSHIP_TRANSFERRED_MESSAGE);

  // Deploy a mock token to later transfer balance to the zeroDAOToken
  const mockName = DEFAULT_MOCK_TOKEN_NAME;
  const mockSymbol = DEFAULT_MOCK_TOKEN_SYMBOL;
  logger.info(`Deploying token: ${mockName} with symbol ${mockSymbol}`);

  const mockTokenFactory = new ERC20Mock__factory(creator);
  const mockToken = await mockTokenFactory.deploy(mockName, mockSymbol);

  if (hre.network.name !== HARDHAT_NETWORK_NAME) {
    await mockToken.deployed();
  }

  logger.info(`${mockName} deployed to address: ${mockToken.address}`);

  const amountToUse = amount ? amount : hre.ethers.utils.parseUnits(DEFAULT_MOCK_TOKEN_AMOUNT, DEFAULT_MOCK_TOKEN_DECIMALS);
  logger.info(`Minting ${amountToUse.toString()} of ${mockSymbol} to ${zeroDAOTokenV1.address}`);

  const balanceBefore = await mockToken.balanceOf(zeroDAOTokenV1.address);
  logger.info(`Balance before minting: ${balanceBefore.toString()}`);

  const tx = await mockToken.mint(zeroDAOTokenV1.address, amountToUse);
  await tx.wait(hre.network.name === HARDHAT_NETWORK_NAME ? 0 : 3);

  const balanceAfter = await mockToken.balanceOf(zeroDAOTokenV1.address);
  logger.info(`Balance after minting: ${balanceAfter.toString()}`);

  // Confirm balance has changed correctly
  assert(balanceAfter.eq(balanceBefore.add(amountToUse)), "Balance minting failed");

  logger.info(`Minting successful: ${amountToUse.toString()} of ${mockSymbol} to ${zeroDAOTokenV1.address}`);

  // Write to file if path specified
  if (outputFile) {
    const proxyAdmin = await hre.upgrades.admin.getInstance();
    const obj = {
      network: hre.network.name,
      timestamp: Date.now(),
      zeroDAOToken: zeroDAOTokenV1.address,
      zeroDAOTokenOwner: newOwnerAddress,
      proxyAdmin: proxyAdmin.address,
      proxyAdminOwner: await proxyAdmin.owner(), // Should be the same as newOwnerAddress
      mockToken: mockToken.address,
      mockTokenAmount: amountToUse.toString(),
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
    logger.info(`Deployment data saved to: ${outputFile}`);
  }

  return zeroDAOTokenV1;
}
