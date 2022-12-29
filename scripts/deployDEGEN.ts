import { BigNumber } from "@ethersproject/bignumber";
import * as hre from "hardhat";
import { doDeployToken } from "../tasks/deploy";
import { ZeroToken } from "../typechain";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployDEGEN");

// 1000000000
const oneMillion = 10 ** 6;
const numDecimals = 18;
const decimals = BigNumber.from(10).pow(numDecimals); // token has 18 decimal places

// one-billion tokens (w/ 18 decimal points)
const tokenMintAmount = BigNumber.from(1000).mul(oneMillion).mul(decimals);

const addresses = {
  mainnet: {
    treasuryAddress: "0xbf41c77275bB5E8DA7F08AE8924494f849d06f33",
    ownerAddress: "0xbf41c77275bB5E8DA7F08AE8924494f849d06f33",
  },
  goerli: {
    treasuryAddress: "0x44B735109ECF3F1A5FE56F50b9874cEf5Ae52fEa",
    ownerAddress: "0x44B735109ECF3F1A5FE56F50b9874cEf5Ae52fEa",
  },
};

async function main() {
  await hre.run("compile");

  logger.log("programmatically deploying vesting contract");

  const network = hre.network.name;
  logger.log(`Deploying to ${network}`);

  if (network !== "mainnet" && network !== "goerli") {
    logger.log("please select either mainnet or goerli network");
    return;
  }

  logger.log(
    `Will mint ${hre.ethers.utils.formatEther(tokenMintAmount)} tokens`
  );

  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  logger.log(
    `'${deploymentAccount.address}' will be used as the deployment account`
  );

  const networkAddresses = addresses[network];

  logger.log(`'${networkAddresses.treasuryAddress}' will be the treasury`);
  logger.log(
    `'${networkAddresses.ownerAddress}' will be transferred ownership`
  );

  const deploymentData = await doDeployToken(
    hre,
    deploymentAccount,
    "DEGEN",
    "DGEN",
    "degen-prod"
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
  const tx = await token.mint(
    networkAddresses.treasuryAddress,
    tokenMintAmount
  );

  logger.log(`waiting to finish`);
  await tx.wait();
  logger.log(`finished minting`);

  logger.log(
    `transferring token ownership to ${networkAddresses.ownerAddress}`
  );
  await token.transferOwnership(networkAddresses.ownerAddress);

  logger.log(
    `transferring proxy admin ownership to ${networkAddresses.ownerAddress}`
  );
  await hre.upgrades.admin.transferProxyAdminOwnership(
    networkAddresses.ownerAddress
  );
}

main();
