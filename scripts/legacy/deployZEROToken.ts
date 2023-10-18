import { ethers } from "ethers";
import * as hre from "hardhat";
import { doDeployToken } from "../../tasks/deploy";
import { ZeroToken } from "../../typechain";
import { getLogger } from "../../utilities";

const logger = getLogger("scripts::deployWILD");

// 10,101,010,101 total tokens (https://www.zine.live/zero-qdo-token-generation-event/)
const tokenMintAmount = ethers.utils.parseEther("10101010101"); // 10101010101 * 10^18 = 10101010101.000000000000000000

// This is what will have all of the tokens once we deploy.
// We will mint `tokenMintAmount` tokens, and transfer to `treasuryAddress`
const treasuryAddress = "0xE0502bBd7b9A21E5Be6FEc0c857C930dbe8C91F1";

// This is what will own the smart contract, having admin access
// and the ability to upgrade the smart contract
const ownerAddress = "0x5eA627ba4cA4e043D38DE4Ad34b73BB4354daf8d";

async function main() {
  await hre.run("compile");

  logger.log(`Deploying to ${hre.network.name}`);

  logger.log(
    `Will mint ${hre.ethers.utils.formatEther(tokenMintAmount)} tokens`
  );

  // Get the deployment account from our hardhat config
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
    "ZERO", // name of token
    "ZERO", // Symbol of Token
    "zero-prod" // Deployment tag
  );

  const token = deploymentData.instance; // Proxy that was deployed

  logger.log(`Deployed contract to ${token.address}`);

  // Initialize implementation to avoid attacks

  logger.log(
    `Initializing implementation contract at '${deploymentData.implementationAddress}' for security.`
  );
  const impl = (await token.attach(
    deploymentData.implementationAddress
  )) as ZeroToken;
  try {
    let tx = await impl.initializeImplementation();
    await tx.wait(2);
  } catch (e) {
    console.log((e as any).message);
  }

  // Mint total supply of tokens into treasury

  logger.log(`Minting tokens...`);
  const tx = await token.mint(treasuryAddress, tokenMintAmount);

  logger.log(`waiting to finish`);
  await tx.wait();
  logger.log(`finished minting`);

  // // Transfer ownership of Token Contract

  logger.log(`transferring token ownership to ${ownerAddress}`);
  await token.transferOwnership(ownerAddress);

  // // Transfer ownership of Proxy Admin

  logger.log(`transferring proxy admin ownership to ${ownerAddress}`);
  await hre.upgrades.admin.transferProxyAdminOwnership(ownerAddress);
}

const tryMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log((e as any).message);
  }
};

tryMain();
