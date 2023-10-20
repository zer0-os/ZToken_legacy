import * as hre from "hardhat";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployZERO");

export async function deployMeowImpl() {
  logger.log(`Deploying the MEOW token implementation contract`);
  logger.log(`Using network: ${hre.network.name}`);

  const [deployer] = await hre.ethers.getSigners();

  logger.log(
    `'${deployer.address}' will be used as the deployment account`
  );

  const factory = await hre.ethers.getContractFactory("MeowToken", deployer);

  const contract = await hre.upgrades.deployImplementation(factory);

  logger.log(`Deployed implementation contract at address: ${contract}`);

  return contract;
}

const tryDeployMeow = async () => {
  await deployMeowImpl()
}

tryDeployMeow();
