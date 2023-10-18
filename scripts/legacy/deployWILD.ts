import { BigNumber } from "@ethersproject/bignumber";
import * as hre from "hardhat";
import { doDeployToken } from "../../tasks/deploy";
import { ZeroToken } from "../../typechain";
import { getLogger } from "../../utilities";

const logger = getLogger("scripts::deployWILD");

const oneMillion = 10 ** 6;
const numDecimals = 18;
const decimals = BigNumber.from(10).pow(numDecimals); // token has 18 decimal places

// five-hundred million tokens (w/ 18 decimal points)
const tokenMintAmount = BigNumber.from(500).mul(oneMillion).mul(decimals);

const treasuryAddress = "0x24089292d5e5B4E487b07C8dF44f973A0AAb7D7b";
const ownerAddress = "0x32eB727B120Acf288306fBD67a60D1b6d8984476";

async function main() {
  await hre.run("compile");

  logger.log("programmatically deploying vesting contract");

  logger.log(`Deploying to ${hre.network.name}`);

  logger.log(
    `Will mint ${hre.ethers.utils.formatEther(tokenMintAmount)} tokens`
  );

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

  const token = deploymentData.instance;

  logger.log(`Deployed contract to ${token.address}`);

  logger.log(
    `Initializing implementation contract at '${deploymentData.implementationAddress}' for security.`
  );
  const impl = (await token.attach(
    deploymentData.implementationAddress
  )) as ZeroToken;
  await impl.initializeImplementation();

  logger.log(`Minting tokens...`);
  const tx = await token.mint(treasuryAddress, tokenMintAmount);

  logger.log(`waiting to finish`);
  await tx.wait();
  logger.log(`finished minting`);

  logger.log(`transferring token ownership to ${ownerAddress}`);
  await token.transferOwnership(ownerAddress);

  logger.log(`transferring proxy admin ownership to ${ownerAddress}`);
  await hre.upgrades.admin.transferProxyAdminOwnership(ownerAddress);
}

main();
