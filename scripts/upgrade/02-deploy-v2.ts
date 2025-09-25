import * as hre from "hardhat";
import { deployV2 } from "./02-helper";


/**
 * Deploy ZeroDAOTokenV2 implementation contract
 * This deploys the V2 implementation that can later be used for upgrades
 */
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();
  const outputFile = `02-deploy-v2-${hre.network.name}.json`;

  await deployV2(
    deployer,
    outputFile
  )
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });
