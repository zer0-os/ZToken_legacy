import * as hre from "hardhat";

import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers"
import { Contract, ContractFactory } from "ethers"

/**
 * Deploy a contract of type `Factory` to the running chain then transfer ownership to `owner`
 * @param factory 
 * @param args 
 * @param owner 
 */
export const deployAndTransferOwner = async <T extends Contract>(
  factory: ContractFactory,
  args: any[],
  ownerAddress: string
) => {
  const contract = await hre.upgrades.deployProxy(factory, args) as T;

  if (hre.network.name !== "hardhat") {
    await contract.deployed();
  }

  await contract["transferOwnership(address)"](ownerAddress);

  return contract;
}