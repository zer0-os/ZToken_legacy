import * as hre from "hardhat";
import { readState } from "./03-helper";


/**
 * Read contract state and store in `outputFile`
 * 
 * @note To be executed twice, BEFORE upgrading and AFTER
 */
const main = async () => {
  const [creator] = await hre.ethers.getSigners();
  const outputFile = `03-read-state-${hre.network.name}.json`;

  await readState(
    creator,
    outputFile
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });