import * as hre from "hardhat";
import *  as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ZeroDAOToken__factory } from "../../typechain";
import { ContractStorageData, readContractStorage } from "../../scripts/utils/storage-check";
import { Contract } from "ethers";

/**
 * Read Contract Storage State
 * 
 * This function reads the complete storage state of a ZeroDAOToken contract.
 * It's used to capture snapshots of contract state before and after upgrades
 * to ensure data integrity is maintained throughout the upgrade process.
 * 
 * @param deployer - The signer account used to interact with the contract
 * @param outputFile - Optional path to save the state data as JSON
 * 
 * @returns Promise<ContractStorageData> - The complete contract storage state
 * 
 * Operations performed:
 * 1. Get contract address from TOKEN_ADDRESS environment variable
 * 2. Create contract instance using ZeroDAOToken factory
 * 3. Read complete contract storage using readContractStorage utility
 * 4. Save state to output file (if specified)
 * 
 * Environment Variables Required:
 * - TOKEN_ADDRESS: Address of the ZeroDAOToken contract to read
 * 
 * Usage:
 * - Called before upgrades to capture baseline state
 * - Called after upgrades to verify state preservation
 * - Used by comparison functions to validate upgrade integrity
 * 
 * @throws Error if TOKEN_ADDRESS is not set for non-hardhat networks
 */
export const readState = async <T>(
  deployer: SignerWithAddress,
  tokenAddress: string,
  outputFile?: string
): Promise<ContractStorageData> => {

  const tokenFactory = new ZeroDAOToken__factory(deployer);
  const token = tokenFactory.attach(tokenAddress);

  const state = await readContractStorage(
    tokenFactory,
    token
  );

  if (outputFile) {
    fs.writeFileSync(outputFile, JSON.stringify(state, undefined, 2));
  }

  return state;
}
