import { BigNumber } from "@ethersproject/bignumber";
import * as hre from "hardhat";
import { doDeployToken } from "../../tasks/deploy";
import { ZeroToken } from "../../typechain";
import { getLogger } from "../../utilities";
import { confirmContinue } from "./shared/utilities";

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

  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  const networkAddresses = addresses[network];

  const deployMetadata = {
    Network: network,
    DeployerAddress: deploymentAccount.address,
    TokenName: "DEGEN",
    TokenSymbol: "DGEN",
    Decimals: 18,
    DeploymentTag: "degen-prod",
    TotalSupply: hre.ethers.utils.formatEther(tokenMintAmount),
    TreasuryAddress: networkAddresses.treasuryAddress,
    OwnerAddress: networkAddresses.ownerAddress,
  };

  console.table([
    ...Object.keys(deployMetadata).map((key) => ({
      Label: key,
      Info: (deployMetadata as any)[key],
    })),
  ]);

  confirmContinue();

  logger.log(`Will mint ${deployMetadata.TotalSupply} tokens`);

  logger.log(
    `'${deployMetadata.DeployerAddress}' will be used as the deployment account`
  );

  logger.log(`'${deployMetadata.TreasuryAddress}' will be the treasury`);
  logger.log(`'${deployMetadata.OwnerAddress}' will be transferred ownership`);

  const deploymentData = await doDeployToken(
    hre,
    deploymentAccount,
    deployMetadata.TokenName,
    deployMetadata.TokenSymbol,
    deployMetadata.DeploymentTag
  );

  const token = deploymentData.instance;

  logger.log(`Deployed contract to ${token.address}`);

  logger.log(
    `Initializing implementation contract at '${deploymentData.implementationAddress}' for security.`
  );
  // Sharing implementation with ZERO
  // const impl = (await token.attach(
  //   deploymentData.implementationAddress
  // )) as ZeroToken;
  // await impl.initializeImplementation();

  logger.log(`Minting tokens...`);
  const tx = await token.mint(deployMetadata.TreasuryAddress, tokenMintAmount);

  logger.log(`waiting to finish`);
  await tx.wait();
  logger.log(`finished minting`);

  logger.log(`transferring token ownership to ${deployMetadata.OwnerAddress}`);
  await token.transferOwnership(deployMetadata.OwnerAddress);

  // Sharing proxy admin
  // logger.log(
  //   `transferring proxy admin ownership to ${deployMetadata.OwnerAddress}`
  // );
  // await hre.upgrades.admin.transferProxyAdminOwnership(
  //   deployMetadata.OwnerAddress
  // );
}

main();
