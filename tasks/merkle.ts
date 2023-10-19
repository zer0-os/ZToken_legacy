import { task, types } from "hardhat/config";
import { getLogger } from "../utilities";
import * as fs from "fs";
import * as vesting from "../utilities/vesting";
import * as airdrop from "../utilities/airdrop";
import { BigNumber, ethers } from "ethers";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import * as ipfs from "ipfs-http-client";

/* eslint-disable @typescript-eslint/no-explicit-any */

const logger = getLogger("tasks::merkle");

type generateFunc = (json: any) => any;
type verifyFunc = (json: any) => boolean;

const ipfsBaseUri = "https://ipfs.io/ipfs/";

const doGenerate = async (
  inputFile: string,
  generate: generateFunc
) => {
  logger.log(`Generating merkle tree from ${inputFile}`);

  const jsonContents = JSON.parse(
    fs.readFileSync(inputFile, { encoding: "utf8" })
  );

  // calculate total amount of tokens
  {
    let total = BigNumber.from(0);
    for (const [, value] of Object.entries(jsonContents) as [
      string,
      any
    ][]) {
      const amount = BigNumber.from(value.amount);
      total = total.add(amount);
    }

    console.log(
      `Total amount granted is ${total.toString()} (${ethers.utils.formatEther(
        total.toString()
      )})`
    );
  }

  if (typeof jsonContents != "object") {
    throw new Error(`Invalid json object`);
  }

  const merkleTree = generate(jsonContents);
  const merkleJson = JSON.stringify(merkleTree, null, 2);

  // strip extension
  let outputFileName = inputFile.split(".").slice(0, -1).join(".");
  outputFileName += "-merkleTree.json";

  logger.log(`Calculated merkle root to be: ${merkleTree.merkleRoot}`);
  logger.log(`Saving merkle tree to ${outputFileName}`);

  fs.writeFileSync(outputFileName, merkleJson);

  const auth =
    'Basic ' + Buffer.from(process.env.INFURA_PROJECT_ID + ':' + process.env.INFURA_SECRET_KEY).toString('base64');

  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const client = ipfs.create({
    protocol: 'https',
    host: "ipfs.infura.io",
    port: 5001,
    headers: {
      authorization: auth
    }
  });
  const entry = await client.add(merkleJson);

  logger.log(`Merkle Tree uploaded to IPFS at: ${ipfsBaseUri}${entry.cid}`);
};

const doVerify = async (merkleFile: string, verify: verifyFunc) => {
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

  const wasValid = verify(jsonContents);

  if (wasValid) {
    logger.log(`✅ Valid merkle tree.`);
  } else {
    logger.error(`❌ Invalid merkle tree.`);
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
    "type",
    "'vesting' for vesting merkle tree or 'airdrop' for airdrop merkle tree",
    "vesting",
    types.string
  )
  .addPositionalParam(
    "file",
    "json file to generate from or verify",
    null,
    types.string
  )
  .setAction(async (taskArguments, hre: HardhatRuntimeEnvironment) => {
    // vesting
    const vestingGenerateFunc = (jsonContents: any) => {
      return vesting.parseBalanceMap(jsonContents);
    };
    const vestingVerifyFunc = (jsonContents: any) => {
      return vesting.verifyMerkleTree(jsonContents);
    };

    // airdrop
    const airdropGenerateFunc = (jsonContents: any) => {
      return airdrop.parseBalanceMap(jsonContents);
    };
    const airdropVerifyFunc = (jsonContents: any) => {
      return airdrop.verifyMerkleTree(jsonContents);
    };

    const generateFuncs: { [key: string]: generateFunc } = {
      vesting: vestingGenerateFunc,
      airdrop: airdropGenerateFunc,
    };

    const verifyFuncs: { [key: string]: verifyFunc } = {
      vesting: vestingVerifyFunc,
      airdrop: airdropVerifyFunc,
    };

    if (taskArguments.type != "vesting" && taskArguments.type != "airdrop") {
      throw new Error(`Unsupported type '${taskArguments.type}'`);
    }

    if (taskArguments.action === "generate") {
      await doGenerate(
        taskArguments.file,
        generateFuncs[taskArguments.type as string],
        hre
      );
    } else if (taskArguments.action === "verify") {
      await doVerify(
        taskArguments.file,
        verifyFuncs[taskArguments.type as string]
      );
    } else {
      throw new Error(`Invalid action ${taskArguments.action}`);
    }
  });
