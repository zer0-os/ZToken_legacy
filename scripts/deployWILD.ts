import * as hre from "hardhat";
import { ERC20Mock, ERC20Mock__factory, ZeroDAOToken, ZeroDAOToken__factory, ZeroDAOTokenV2, ZeroDAOTokenV2__factory } from "../typechain";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployVesting");

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  await hre.run("compile");

  logger.log(`Deploying to ${hre.network.name}`);

  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  logger.log(
    `'${deploymentAccount.address}' will be used as the deployment account`
  );

  const deployWILDTx = await hre.upgrades.deployProxy(
    new ZeroDAOToken__factory(deployer),
    [
      "WILDER WORLD",
      "WILD"
    ]
  );

  const wildToken: ZeroDAOToken = await deployWILDTx.deployed() as ZeroDAOToken;
  logger.info(`Deployed WILD Token to: ${wildToken.address}`);

  const mockFactory = new ERC20Mock__factory(deployer);
  const mockToken: ERC20Mock = await mockFactory.deploy("MOCK TOKEN", "MOCK") as ERC20Mock;

  logger.info(`Deployed MOCK Token to: ${mockToken.address}`);
}

main();
