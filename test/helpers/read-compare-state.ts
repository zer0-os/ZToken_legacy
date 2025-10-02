import *  as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { compareStorageData, ContractStorageData, readContractStorage } from "../../scripts/utils/storage-check";
import { readState } from "./read-state";
import { getLogger } from "../../utilities";
import {
  READ_AND_COMPARE_LOGGER,
  READING_POST_UPGRADE_STATE_MESSAGE,
  COMPARING_STATES_MESSAGE,
  STORAGE_COMPARISON_PASSED_MESSAGE,
  STORAGE_COMPARISON_FAILED_MESSAGE
} from "./constants";

/**
 * Read Current Contract State and Compare with Previous State
 * 
 * This function reads the current contract state and compares it with a previously
 * captured state to ensure that contract upgrades haven't corrupted existing data.
 * It's a critical validation step in the upgrade process.
 * 
 * @param deployer - The signer account used to interact with the contract
 * @param priorState - Previously captured contract state data to compare against
 * @param outputFile - Optional path to save the current state data as JSON
 * 
 * Operations performed:
 * 1. Read current contract state using readState function
 * 2. Save current state to output file (if specified)
 * 3. Compare current state with prior state using compareStorageData
 * 4. Log success or throw error if differences are found
 * 
 * Environment Variables Required:
 * - TOKEN_ADDRESS: Address of the contract to read state from
 * 
 * @throws Error if storage comparison fails (indicates data corruption)
 * @throws Error if TOKEN_ADDRESS is not set
 */
export const readCompareState = async (
  deployer: SignerWithAddress,
  tokenAddress: string,
  priorState: ContractStorageData,
  outputFile?: string,
  verbose: boolean = false
) => {
  const logger = getLogger(READ_AND_COMPARE_LOGGER);
  logger.state.isEnabled = verbose;


  logger.info(READING_POST_UPGRADE_STATE_MESSAGE);

  const state = await readState(
    deployer,
    tokenAddress,
    outputFile,
  );

  logger.info(COMPARING_STATES_MESSAGE);

  try {
    compareStorageData(priorState, state);
    logger.info(STORAGE_COMPARISON_PASSED_MESSAGE);
  } catch (error) {
    logger.error(STORAGE_COMPARISON_FAILED_MESSAGE, error);
    throw error;
  }
}
