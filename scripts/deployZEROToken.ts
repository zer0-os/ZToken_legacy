import { BigNumber } from "@ethersproject/bignumber";
import { ethers } from "ethers";
import * as hre from "hardhat";
import { doDeployToken } from "../tasks/deploy";
import { ZeroToken } from "../typechain";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployWILD");

// 10,101,010,101 total tokens (https://www.zine.live/zero-qdo-token-generation-event/)
const tokenMintAmount = ethers.utils.parseEther("10101010101");

const treasuryAddress = "0x24089292d5e5B4E487b07C8dF44f973A0AAb7D7b";
const ownerAddress = "0x32eB727B120Acf288306fBD67a60D1b6d8984476";

async function main() {
  await hre.run("compile");

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

  // Deploy the token itself

  const deploymentData = await doDeployToken(
    hre,
    deploymentAccount,
    "Zer0", // name of token
    "ZER0", // Symbol of Token
    "zer0-prod" // Deployment tag
  );

  const token = deploymentData.instance;

  logger.log(`Deployed contract to ${token.address}`);

  // Initialize implementation to avoid attacks

  logger.log(
    `Initializing implementation contract at '${deploymentData.implementationAddress}' for security.`
  );
  const impl = (await token.attach(
    deploymentData.implementationAddress
  )) as ZeroToken;
  await impl.initializeImplementation();

  // Mint total supply of tokens into treasury

  logger.log(`Minting tokens...`);
  const tx = await token.mint(treasuryAddress, tokenMintAmount);

  logger.log(`waiting to finish`);
  await tx.wait();
  logger.log(`finished minting`);

  // Transfer ownership of Token Contract

  logger.log(`transferring token ownership to ${ownerAddress}`);
  await token.transferOwnership(ownerAddress);

  // Transfer ownership of Proxy Admin

  logger.log(`transferring proxy admin ownership to ${ownerAddress}`);
  await hre.upgrades.admin.transferProxyAdminOwnership(ownerAddress);
}

main();
