import MerkleTree from "../merkleTree";
import { BigNumber, utils } from "ethers";

export default class BalanceTree {
  private readonly tree: MerkleTree;
  constructor(
    balances: { account: string; amount: BigNumber; revocable: boolean }[]
  ) {
    this.tree = new MerkleTree(
      balances.map(({ account, amount, revocable }, index) => {
        return BalanceTree.toNode(index, account, amount, revocable);
      })
    );
  }

  public static verifyProof(
    index: number | BigNumber,
    account: string,
    amount: BigNumber,
    revocable: boolean,
    proof: Buffer[],
    root: Buffer
  ): boolean {
    let pair = BalanceTree.toNode(index, account, amount, revocable);
    for (const item of proof) {
      pair = MerkleTree.combinedHash(pair, item);
    }

    return pair.equals(root);
  }

  // keccak256(abi.encode(index, account, amount))
  public static toNode(
    index: number | BigNumber,
    account: string,
    amount: BigNumber,
    revocable: boolean
  ): Buffer {
    return Buffer.from(
      utils
        .solidityKeccak256(
          ["uint256", "address", "uint256", "bool"],
          [index, account, amount, revocable]
        )
        .substr(2),
      "hex"
    );
  }

  public getHexRoot(): string {
    return this.tree.getHexRoot();
  }

  // returns the hex bytes32 values of the proof
  public getProof(
    index: number | BigNumber,
    account: string,
    amount: BigNumber,
    revocable: boolean
  ): string[] {
    return this.tree.getHexProof(
      BalanceTree.toNode(index, account, amount, revocable)
    );
  }
}
