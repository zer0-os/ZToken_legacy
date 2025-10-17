import {
  getStorageLayout,
  getUnlinkedBytecode,
  getVersion,
  StorageLayout,
} from "@openzeppelin/upgrades-core";
import { readValidations } from "@openzeppelin/hardhat-upgrades/dist/validations";
import { BigNumber, Contract, ContractFactory } from "ethers";
import * as hre from "hardhat";

export type ContractStorageElement =
  | string
  | number
  | BigNumber
  | Array<{}>;
export type ContractStorageData = Array<{
  [label: string]: ContractStorageElement;
}>;
export type ContractStorageDiff = Array<{
  key: string;
  valueBefore: ContractStorageElement;
  valueAfter: ContractStorageElement;
}>;

export const getContractStorageLayout = async (
  contractFactory: ContractFactory
): Promise<StorageLayout> => {
  const validations = await readValidations(hre);
  const unlinkedBytecode = getUnlinkedBytecode(
    validations,
    contractFactory.bytecode
  );
  const version = getVersion(unlinkedBytecode, contractFactory.bytecode);

  return getStorageLayout(validations, version);
};

export const readContractStorage = async (
  contractFactory: ContractFactory,
  contractObj: Contract
): Promise<ContractStorageData> => {
  const layout = await getContractStorageLayout(contractFactory);

  return layout.storage.reduce(
    async (
      acc: Promise<ContractStorageData>,
      { label, type }
    ): Promise<ContractStorageData> => {
      const newAcc = await acc;

      if (type.includes("mapping") || type.includes("array")) return newAcc; // Skip mappings and arrays

      try {
        const newLabel = label.startsWith("_") ? label.slice(1) : label;
        const value = await contractObj[newLabel as keyof Contract]();

        newAcc.push({ [label]: value });
      } catch (e: unknown) {
        if ((e as Error).message.includes("is not a function")) return newAcc; // Skip non-public variables

        console.log(`Error on LABEL ${label}: ${(e as Error).message}`);
      }

      return newAcc;
    },
    Promise.resolve([])
  );
};

export const compareStorageData = (
  dataBefore: ContractStorageData,
  dataAfter: ContractStorageData
) => {
  const storageDiff = dataAfter.reduce(
    (acc: ContractStorageDiff | undefined, stateVar, idx) => {
      const [key, value] = Object.entries(stateVar)[0];

      if (!dataBefore[idx]) return acc;

      const equals = BigNumber.isBigNumber(value)
        ? (value as BigNumber).eq(dataBefore[idx][key] as BigNumber)
        : value === dataBefore[idx][key];

      if (!equals) {
        console.error(
          `Mismatch on state var ${key} at idx ${idx}! Prev value: ${dataBefore[idx][key]}, new value: ${value}`
        );

        return [
          ...(acc as ContractStorageDiff),
          {
            key,
            valueBefore: dataBefore[idx][key],
            valueAfter: value,
          },
        ];
      } else {
        return acc;
      }
    },
    []
  );

  if (storageDiff && storageDiff.length > 0) {
    throw new Error(`Storage data mismatch: ${JSON.stringify(storageDiff)}`);
  }
};
