import * as hre from "hardhat";
import { deployV1 } from "./01-helper";

/**
 * Perform a deployment of a ZeroDAOToken as well as an ERC20Mock token
 */
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();
  const outputFile = `01-deploy-v1-${hre.network.name}.json`;

  await deployV1(
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
