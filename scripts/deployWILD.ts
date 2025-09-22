import * as hre from "hardhat";
import { ERC20Mock, ERC20Mock__factory, ZeroDAOToken, ZeroDAOToken__factory, ZeroDAOTokenV2, ZeroDAOTokenV2__factory } from "../typechain";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployWILD");

const oneMillion = 10 ** 6;
const numDecimals = 18;
const decimals = BigNumber.from(10).pow(numDecimals); // token has 18 decimal places

// five-hundred million tokens (w/ 18 decimal points)
const tokenMintAmount = BigNumber.from(500).mul(oneMillion).mul(decimals);

const treasuryAddress = "0x24089292d5e5B4E487b07C8dF44f973A0AAb7D7b";
const ownerAddress = "0x32eB727B120Acf288306fBD67a60D1b6d8984476";

async function main() {
  const [deployer] = await hre.ethers.getSigners();

  await hre.run("compile");

  logger.log(`Deploying to ${hre.network.name}`);

  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  logger.log(
    `'${deploymentAccount.address}' will be used as the deployment account`
  );

  logger.log(`'${treasuryAddress}' will be the treasury`);
  logger.log(`'${ownerAddress}' will be transferred ownership`);

  const deploymentData = await doDeployToken(
    hre,
    deploymentAccount,
    "Wilder",
    "WILD",
    "wilder-prod"
  );

  const wildToken: ZeroDAOToken = await deployWILDTx.deployed() as ZeroDAOToken;
  logger.info(`Deployed WILD Token to: ${wildToken.address}`);

  const mockFactory = new ERC20Mock__factory(deployer);
  const mockToken: ERC20Mock = await mockFactory.deploy("MOCK TOKEN", "MOCK") as ERC20Mock;

  logger.info(`Deployed MOCK Token to: ${mockToken.address}`);
}

main();
