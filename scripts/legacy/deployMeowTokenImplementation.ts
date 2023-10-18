import * as hre from "hardhat";
import { MeowToken } from "../../typechain";


async function main() {

  // Get the deployment account from our hardhat config
  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  console.log(
    `'${deploymentAccount.address}' will be used as the deployment account`
  );

  // Deploy the token itself

  const tokenArtefact = await hre.ethers.getContractFactory(
    "MeowToken",
    deploymentAccount
  );
  const tokenImpl = await tokenArtefact.deploy();
  await tokenImpl.deployed();
  console.log(`token imp deployed at ${tokenImpl.address}`);
}

const tryMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log((e as any).message);
  }
};

tryMain();
