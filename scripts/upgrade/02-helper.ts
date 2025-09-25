import * as hre from "hardhat";
import *  as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getLogger } from "../../utilities";
import { ZeroDAOTokenV2__factory, ZeroDAOTokenV2 } from "../../typechain";


export const deployV2 = async (
  deployer: SignerWithAddress,
  outputFile?: string
): Promise<ZeroDAOTokenV2> => {
  const logger = getLogger("deploy-v2");
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

  // Write to file if path is given
  if (outputFile) {
    const obj = {
      network: hre.network.name,
      zeroDAOTokenV2Implementation: zeroDAOTokenV2.address,
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
    logger.info(`Deployment data saved to: ${outputFile}`);
  }

  return zeroDAOTokenV2;
}