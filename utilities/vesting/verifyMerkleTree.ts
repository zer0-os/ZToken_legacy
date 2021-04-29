import { BigNumber, utils } from "ethers";
import { MerkleDistributorInfo } from "./createMerkle";
import { getLogger } from "../";

const logger = getLogger("utilities::verifyMerkleTree");

const combinedHash = (first: Buffer, second: Buffer): Buffer => {
  if (!first) {
    return second;
  }
  if (!second) {
    return first;
  }

  return Buffer.from(
    utils
      .solidityKeccak256(
        ["bytes32", "bytes32"],
        [first, second].sort(Buffer.compare)
      )
      .slice(2),
    "hex"
  );
};

const toNode = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber,
  revocable: boolean
): Buffer => {
  const pairHex = utils.solidityKeccak256(
    ["uint256", "address", "uint256", "bool"],
    [index, account, amount, revocable]
  );
  return Buffer.from(pairHex.slice(2), "hex");
};

const verifyProof = (
  index: number | BigNumber,
  account: string,
  amount: BigNumber,
  revocable: boolean,
  proof: Buffer[],
  root: Buffer
): boolean => {
  let pair = toNode(index, account, amount, revocable);
  for (const item of proof) {
    pair = combinedHash(pair, item);
  }

  return pair.equals(root);
};

const getNextLayer = (elements: Buffer[]): Buffer[] => {
  return elements.reduce<Buffer[]>((layer, el, idx, arr) => {
    if (idx % 2 === 0) {
      // Hash the current element with its pair element
      layer.push(combinedHash(el, arr[idx + 1]));
    }

    return layer;
  }, []);
};

const getRoot = (
  balances: {
    account: string;
    amount: BigNumber;
    revocable: boolean;
    index: number;
  }[]
): Buffer => {
  let nodes = balances
    .map(({ account, amount, revocable, index }) =>
      toNode(index, account, amount, revocable)
    )
    // sort by lexicographical order
    .sort(Buffer.compare);

  // deduplicate any eleents
  nodes = nodes.filter((el, idx) => {
    return idx === 0 || !nodes[idx - 1].equals(el);
  });

  const layers = [];
  layers.push(nodes);

  // Get next layer until we reach the root
  while (layers[layers.length - 1].length > 1) {
    layers.push(getNextLayer(layers[layers.length - 1]));
  }

  return layers[layers.length - 1][0];
};

export const verifyMerkleTree = (tree: MerkleDistributorInfo): boolean => {
  const merkleRootHex = tree.merkleRoot;
  const merkleRoot = Buffer.from(merkleRootHex.slice(2), "hex");

  const balances: {
    index: number;
    account: string;
    amount: BigNumber;
    revocable: boolean;
  }[] = [];
  let valid = true;

  Object.keys(tree.claims).forEach((address) => {
    const claim = tree.claims[address];
    const proof = claim.proof.map((p: string) =>
      Buffer.from(p.slice(2), "hex")
    );
    const claimAmount = BigNumber.from(claim.amount);

    balances.push({
      index: claim.index,
      account: address,
      amount: claimAmount,
      revocable: claim.revocable,
    });
    if (
      verifyProof(
        claim.index,
        address,
        claimAmount,
        claim.revocable,
        proof,
        merkleRoot
      )
    ) {
      logger.debug("Verified proof for", claim.index, address);
    } else {
      logger.debug("Verification for", address, "failed");
      valid = false;
    }
  });

  if (!valid) {
    throw new Error("Failed validation for 1 or more proofs");
  }

  const root = getRoot(balances).toString("hex");
  logger.debug("Reconstructed merkle root", root);
  const rootsMatch = root === merkleRootHex.slice(2);
  return rootsMatch;
};
