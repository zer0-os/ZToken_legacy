import { task, types } from "hardhat/config";
import { getLogger } from "../utilities";
import * as fs from "fs";
import * as vesting from "../utilities/vesting";

const logger = getLogger("tasks::merkle");

const generateVestingMerkleTree = async (inputFile: string) => {
  logger.log(`Generating merkle tree from ${inputFile}`);

  const jsonContents = JSON.parse(
    fs.readFileSync(inputFile, { encoding: "utf8" })
  );

  if (typeof jsonContents != "object") {
    throw new Error(`Invalid json object`);
  }

  const merkleTree = vesting.parseBalanceMap(jsonContents);
  const merkleJson = JSON.stringify(merkleTree, null, 2);

  // strip extension
  let outputFileName = inputFile.split(".").slice(0, -1).join(".");
  outputFileName += "-merkleTree.json";

  logger.log(`Calculated merkle root to be: ${merkleTree.merkleRoot}`);
  logger.log(`Saving merkle tree to ${outputFileName}`);

  fs.writeFileSync(outputFileName, merkleJson);
};

const doVerifyVestingMerkleTree = async (merkleFile: string) => {
  logger.log(`Verifying merkle tree from ${merkleFile}`);
  logger.info(
    `Make sure you are using the merkle tree file and not the input file here!`
  );

  const jsonContents = JSON.parse(
    fs.readFileSync(merkleFile, { encoding: "utf8" })
  );

  if (typeof jsonContents != "object") {
    throw new Error(`Invalid json object`);
  }

  const wasValid = vesting.verifyMerkleTree(jsonContents);

  if (wasValid) {
    logger.log(`Valid merkle tree.`);
  } else {
    logger.error(`Invalid merkle tree.`);
  }
};

task("merkle", "Generates a merkle tree from a json file.")
  .addPositionalParam(
    "type",
    "'vesting' for vesting merkle tree or 'token' for token distribution merkle tree",
    "vesting",
    types.string
  )
  .addPositionalParam(
    "action",
    "'generate' to create 'verify' to verify'",
    "generate",
    types.string
  )
  .addPositionalParam(
    "file",
    "json file to generate from or verify",
    null,
    types.string
  )
  .setAction(async (taskArguments) => {
    if (taskArguments.action === "generate") {
      await generateVestingMerkleTree(taskArguments.file);
    } else if (taskArguments.action === "verify") {
      await doVerifyVestingMerkleTree(taskArguments.file);
    } else {
      throw new Error(`Invalid action ${taskArguments.action}`);
    }
  });
