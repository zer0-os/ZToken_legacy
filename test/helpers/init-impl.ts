import * as hre from "hardhat";
import { IMPL_STORAGE_SLOT } from "./constants";
import { ContractFactory } from "ethers";

export const initImpl = async (
  contractFactory: ContractFactory,
  contractAddress: string
): Promise<string> => {
  const paddedImplAddr = await hre.ethers.provider.getStorageAt(
    contractAddress,
    IMPL_STORAGE_SLOT
  );

  // Skip the 0 padding between the "0x" and the actual address
  const implAddr = paddedImplAddr.slice(0, 2) + paddedImplAddr.slice(26);

  const tokenV2Impl = contractFactory.attach(implAddr);

  await tokenV2Impl.initializeImplementation();

  return tokenV2Impl.owner();
}