import * as hre from "hardhat";
import *  as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getLogger } from "../../utilities";
import { ZeroDAOTokenV3__factory, ZeroDAOTokenV3 } from "../../typechain";
import {
  HARDHAT_NETWORK_NAME,
  DEPLOYING_V3_MESSAGE,
  DEPLOY_V3_LOGGER
} from "./constants";

/**
 * Deploy V3 Implementation Contract
 * 
 * This function deploys the ZeroDAOTokenV3 implementation contract that will be used
 * for upgrading existing V2 proxy contract. This deployment creates only the
 * implementation contract, not a proxy - the actual upgrade happens separately.
 * 
 * @param deployer - The signer account that will deploy the implementation contract
 * @param outputFile - Optional path to save deployment details as JSON
 * 
 * @returns Promise<ZeroDAOTokenV3> - The deployed ZeroDAOTokenV3 implementation contract
 * 
 * Operations performed:
 * 1. Deploy ZeroDAOTokenV3 implementation contract (not as proxy)
 * 2. Wait for deployment confirmation on non-hardhat networks
 * 3. Save deployment details to output file (if specified)
 * 
 * Usage Notes:
 * - This creates the implementation that can be used with OpenZeppelin's upgradeProxy
 * - The implementation address from this deployment is used in upgrade transactions
 * 
 * @throws Error if deployment fails
 */
export const deployV3 = async (
  deployer: SignerWithAddress,
  outputFile?: string,
  verbose: boolean = false
): Promise<ZeroDAOTokenV3> => {
  const logger = getLogger(DEPLOY_V3_LOGGER);
  logger.state.isEnabled = verbose;

  logger.info(`Network: ${hre.network.name}`);
  logger.info(DEPLOYING_V3_MESSAGE);
  logger.info(`Deployer: ${deployer.address}`);

  // Deploy ZeroDAOTokenV3 implementation (not as proxy)
  const tokenFactory = new ZeroDAOTokenV3__factory(deployer);
  const zeroDAOTokenV3 = await tokenFactory.deploy() as ZeroDAOTokenV3;

  if (hre.network.name !== HARDHAT_NETWORK_NAME) {
    await zeroDAOTokenV3.deployed();
  }

  logger.info(`ZeroDAOTokenV3 implementation deployed to address: ${zeroDAOTokenV3.address}`);

  // Write to file if path is given
  if (outputFile) {
    const obj = {
      network: hre.network.name,
      zeroDAOTokenV3Implementation: zeroDAOTokenV3.address,
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
    logger.info(`Deployment data saved to: ${outputFile}`);
  }

  return zeroDAOTokenV3;
}
