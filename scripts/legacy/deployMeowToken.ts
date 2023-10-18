import * as hre from "hardhat";
import { MeowToken } from "../../typechain";

async function main() {

  // Get the deployment account from our hardhat config
  const accounts = await hre.ethers.getSigners();
  const deploymentAccount = accounts[0];

  console.log(
    `'${deploymentAccount.address}' will be used as the deployment account`
  );


  // Get the contract artefact

  const tokenArtefact = await hre.ethers.getContractFactory(
    "MeowToken",
    deploymentAccount
  );

  // deploy proxy upgradeable

  const contract = await hre.upgrades.deployProxy(tokenArtefact, [
    "MEOW",
    "MEOW",
    10101010101
  ]);
  await contract.deployed();
  console.log(`token imp deployed at ${contract.address}`);
}

const tryMain = async () => {
  try {
    await main();
  } catch (e) {
    console.log((e as any).message);
  }
};

tryMain();
