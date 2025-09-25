import *  as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { ZeroDAOToken__factory } from "../../typechain";
import { ContractStorageData, readContractStorage } from "../utils/storage-check";


export const readState = async (
  deployer: SignerWithAddress,
  outputFile?: string
): Promise<ContractStorageData> => {
  const tokenAddress = process.env.TOKEN_ADDRESS; // TODO move to script and test independently for this val
  if (!tokenAddress) throw Error("No token address present in env");

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