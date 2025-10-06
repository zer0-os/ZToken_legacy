import * as hre from "hardhat";
import * as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getLogger } from "../../utilities";
import { ZeroDAOTokenV2__factory, ZeroDAOTokenV2 } from "../../typechain";
import {
  HARDHAT_NETWORK_NAME,
  DEPLOY_V2_LOGGER,
  DEPLOYING_V2_MESSAGE,
} from "./constants";

/**
 * Deploy V2 Implementation Contract
 *
 * This function deploys the ZeroDAOTokenV2 implementation contract that will be used
 * for upgrading existing V1 proxy contracts. This deployment creates only the
 * implementation contract, not a proxy - the actual upgrade happens separately.
 *
 * @param deployer - The signer account that will deploy the implementation contract
 * @param outputFile - Optional path to save deployment details as JSON
 *
 * @returns Promise<ZeroDAOTokenV2> - The deployed ZeroDAOTokenV2 implementation contract
 *
 * Operations performed:
 * 1. Deploy ZeroDAOTokenV2 implementation contract (not as proxy)
 * 2. Wait for deployment confirmation on non-hardhat networks
 * 3. Save deployment details to output file (if specified)
 *
 * Usage Notes:
 * - This creates the implementation that can be used with OpenZeppelin's upgradeProxy
 * - The implementation address from this deployment is used in upgrade transactions
 *
 * @throws Error if deployment fails
 */
export const deployV2 = async (
  deployer: SignerWithAddress,
  outputFile?: string,
  verbose = false
): Promise<ZeroDAOTokenV2> => {
  const logger = getLogger(DEPLOY_V2_LOGGER);
  logger.state.isEnabled = verbose;

  logger.info(`Network: ${hre.network.name}`);
  logger.info(DEPLOYING_V2_MESSAGE);
  logger.info(`Deployer: ${deployer.address}`);

  // Deploy ZeroDAOTokenV2 implementation (not as proxy)
  const tokenFactory = new ZeroDAOTokenV2__factory(deployer);
  const zeroDAOTokenV2 = (await tokenFactory.deploy()) as ZeroDAOTokenV2;

  if (hre.network.name !== HARDHAT_NETWORK_NAME) {
    await zeroDAOTokenV2.deployed();
  }

  logger.info(
    `ZeroDAOTokenV2 implementation deployed to address: ${zeroDAOTokenV2.address}`
  );

  // Write to file if path is given
  if (outputFile) {
    const obj = {
      network: hre.network.name,
      zeroDAOTokenV2Implementation: zeroDAOTokenV2.address,
      deployedAt: new Date().toISOString(),
    };

    fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
    logger.info(`Deployment data saved to: ${outputFile}`);
  }

  return zeroDAOTokenV2;
};
