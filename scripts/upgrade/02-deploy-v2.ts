import * as hre from "hardhat";
import * as fs from "fs";
import { ZeroDAOTokenV2__factory, ZeroDAOTokenV2 } from "../../typechain";
import { getLogger } from "../../utilities";

const logger = getLogger("deploy-v2");

/**
 * Deploy ZeroDAOTokenV2 implementation contract
 * This deploys the V2 implementation that can later be used for upgrades
 */
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();

  logger.info(`Network: ${hre.network.name}`);
  logger.info(`Deploying ZeroDAOTokenV2 implementation`);
  logger.info(`Deployer: ${deployer.address}`);

  // Deploy ZeroDAOTokenV2 implementation (not as proxy)
  const tokenFactory = new ZeroDAOTokenV2__factory(deployer);
  const zeroDAOTokenV2 = await tokenFactory.deploy() as ZeroDAOTokenV2;

  if (hre.network.name !== "hardhat") {
    await zeroDAOTokenV2.deployed();
  }

  logger.info(`ZeroDAOTokenV2 implementation deployed to address: ${zeroDAOTokenV2.address}`);

  const obj = {
    network: hre.network.name,
    zeroDAOTokenV2Implementation: zeroDAOTokenV2.address,
    deployedAt: new Date().toISOString()
  };

  // Write to file with predictable naming
  const outputFile = `02-deploy-v2-${hre.network.name}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
  logger.info(`Deployment data saved to: ${outputFile}`);

  logger.info("=== Deployment Summary ===");
  logger.info(`Network: ${obj.network}`);
  logger.info(`ZeroDAOTokenV2 Implementation: ${obj.zeroDAOTokenV2Implementation}`);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Deployment failed:", error);
    process.exit(1);
  });
