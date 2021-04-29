import { BigNumber, utils } from "ethers";
import { MerkleInfo } from "../helpers";
import BalanceTree from "./balanceTree";

const { isAddress, getAddress } = utils;

// This is the blob that gets distributed and pinned to IPFS.
// It is completely sufficient for recreating the entire merkle tree.
export interface MerkleDistributorInfo extends MerkleInfo {
  tokenTotal: string;
  claims: {
    [account: string]: {
      index: number;
      amount: string;
      revocable: boolean;
      proof: string[];
      flags?: {
        [flag: string]: boolean;
      };
    };
  };
}

type OldFormat = {
  [account: string]: {
    amount: number | string;
    revocable: boolean;
  };
};
type NewFormat = {
  address: string;
  balance: string;
  revocable: boolean;
  reasons: string;
};

export function parseBalanceMap(
  balances: OldFormat | NewFormat[]
): MerkleDistributorInfo {
  // if balances are in an old format, process them
  const balancesInNewFormat: NewFormat[] = Array.isArray(balances)
    ? balances
    : Object.keys(balances).map(
        (account): NewFormat => ({
          address: account,
          // earnings: `0x${balances[account].toString(16)}`,
          balance: balances[account].amount.toString(),
          revocable: balances[account].revocable,
          reasons: "",
        })
      );

  const dataByAddress = balancesInNewFormat.reduce<{
    [address: string]: {
      amount: BigNumber;
      revocable: boolean;
      flags?: { [flag: string]: boolean };
    };
  }>((memo, { address: account, balance, reasons, revocable }) => {
    if (!isAddress(account)) {
      throw new Error(`Found invalid address: ${account}`);
    }
    const parsed = getAddress(account);
    if (memo[parsed]) throw new Error(`Duplicate address: ${parsed}`);
    const parsedNum = BigNumber.from(balance);
    if (parsedNum.lte(0))
      throw new Error(`Invalid amount for account: ${account}`);

    const flags = {};

    memo[parsed] = {
      amount: parsedNum,
      revocable,
      ...(reasons === "" ? {} : { flags }),
    };
    return memo;
  }, {});

  const sortedAddresses = Object.keys(dataByAddress).sort();

  // construct a tree
  const tree = new BalanceTree(
    sortedAddresses.map((address) => ({
      account: address,
      amount: dataByAddress[address].amount,
      revocable: dataByAddress[address].revocable,
    }))
  );

  // generate claims
  const claims = sortedAddresses.reduce<{
    [address: string]: {
      amount: string;
      revocable: boolean;
      index: number;
      proof: string[];
      flags?: { [flag: string]: boolean };
    };
  }>((memo, address, index) => {
    const { amount, flags, revocable } = dataByAddress[address];
    memo[address] = {
      index,
      amount: amount.toString(),
      revocable,
      proof: tree.getProof(index, address, amount, revocable),
      ...(flags ? { flags } : {}),
    };
    return memo;
  }, {});

  const tokenTotal: BigNumber = sortedAddresses.reduce<BigNumber>(
    (memo, key) => memo.add(dataByAddress[key].amount),
    BigNumber.from(0)
  );

  return {
    merkleRoot: tree.getHexRoot(),
    tokenTotal: tokenTotal.toString(),
    claims,
  };
}
