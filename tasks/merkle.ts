import { task, types } from "hardhat/config";
import { getLogger } from "../utilities";
import * as fs from "fs";
import { parseBalanceMap } from "../utilities/createMerkle";
import { verifyMerkleTree } from "../utilities/verifyMerkleTree";

const logger = getLogger("tasks::merkle");

const generateMerkleTree = async (inputFile: string) => {
  logger.log(`Generating merkle tree from ${inputFile}`);

  const jsonContents = JSON.parse(
    fs.readFileSync(inputFile, { encoding: "utf8" })
  );

  if (typeof jsonContents != "object") {
    throw new Error(`Invalid json object`);
  }

  const merkleTree = parseBalanceMap(jsonContents);
  const merkleJson = JSON.stringify(merkleTree, null, 2);

  // strip extension
  let outputFileName = inputFile.split(".").slice(0, -1).join(".");
  outputFileName += "-merkleTree.json";

  logger.log(`Calculated merkle root to be: ${merkleTree.merkleRoot}`);
  logger.log(`Saving merkle tree to ${outputFileName}`);

  fs.writeFileSync(outputFileName, merkleJson);
};

const doVerifyMerkleTree = async (merkleFile: string) => {
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

  const wasValid = verifyMerkleTree(jsonContents);

  if (wasValid) {
    logger.log(`Valid merkle tree.`);
  } else {
    logger.error(`Invalid merkle tree.`);
  }
};

task("merkle", "Generates a merkle tree from a json file.")
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
      await generateMerkleTree(taskArguments.file);
    } else if (taskArguments.action === "verify") {
      await doVerifyMerkleTree(taskArguments.file);
    } else {
      throw new Error(`Invalid action ${taskArguments.action}`);
    }
  });
