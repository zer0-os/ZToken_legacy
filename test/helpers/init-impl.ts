import * as hre from "hardhat";
import { IMPL_STORAGE_SLOT } from "./constants";
import { ContractFactory } from "ethers";

export const initImpl = async (
  contractFactory: ContractFactory,
  contractAddress: string
): Promise<string> => {
  const tokenV2Impl = contractFactory.attach(contractAddress);

  await tokenV2Impl.initializeImplementation();

  return tokenV2Impl.owner();
};
