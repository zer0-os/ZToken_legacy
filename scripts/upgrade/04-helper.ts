import *  as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ZeroDAOToken__factory } from "../../typechain";
import { compareStorageData, ContractStorageData, readContractStorage } from "../utils/storage-check";
import { readState } from "./03-helper";

import { getLogger } from "../../utilities";



export const readAndCompare = async (
  deployer: SignerWithAddress,
  priorState: ContractStorageData,
  outputFile?: string
) => {
  const logger = getLogger("readAndCompare");

  logger.info("Reading current state...");

  const state = await readState(
    deployer,
    outputFile
  );

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(state, undefined, 2));
  }

  logger.info('Comparing pre and post upgrade states...');
  try {
    compareStorageData(priorState, state);
    logger.info('Storage comparison passed - no differences found');
  } catch (error) {
    logger.error('Storage comparison failed:', error);
    throw error;
  }
}