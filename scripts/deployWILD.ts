import { BigNumber } from "@ethersproject/bignumber";
import * as hre from "hardhat";
import { doDeployToken } from "../tasks/deploy";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployVesting");

const oneMillion = 10 ** 6;
const numDecimals = 18;
const decimals = BigNumber.from(10).pow(numDecimals); // token has 18 decimal places
const tokenMintAmount = BigNumber.from(50).mul(oneMillion).mul(decimals);

const treasuryAddress = "0x4A4BcDa21DcB59AB6F3937Df10A027Ae6d48Ca07";
const ownerAddress = "0xA208e811318376b0615a727c9C34BC0a428f3723";

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

  const token = await doDeployToken(
    hre,
    deploymentAccount,
    "WILDER WORLD",
    "WILD",
    "wild-prod"
  );

  logger.log(`Deployed contract to ${token.address}`);

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
