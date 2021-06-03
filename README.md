# Zer0 Token

This repository contains the Zer0 Token and other utility contracts for airdropping and vesting ERC20 tokens.

Check out the [docs](./docs) folder for more information on what they do.

## Building and Development

Follow this guide to learn how to get started with building and developing locally.

This guide will assume you are using [Visual Studio Code](https://code.visualstudio.com/) as an IDE, however you can use whatever IDE you would like.

### Required Tools

This project requires [yarn](https://yarnpkg.com/) to be installed on your system, as well as [node.js](https://nodejs.org/en/download/).
Please ensure those are installed on your system before continuing.

### Getting Started

In the command line terminal, run the following:

```bash
yarn
```

This will:

- Install required node packages (*this may take awhile*)
- Compile the smart contracts
- Generate [typechain](https://github.com/ethereum-ts/TypeChain) helper types

This step should complete without any errors.
If you encounter errors there may be something wrong with your `node` or `yarn` installation, ensure you have node version 14 or higher.

If you are still encountering errors please file a GitHub issue with as much detail as possible.

### Running Tests

To run the tests for the smart contracts simply run

```bash
yarn test
```

You can check test coverage by running

```bash
yarn coverage
```

> You may get a warning about contract code size exceeding 24576 bytes, you can ignore this.

### Compiling Contracts

If you ever need to recompile the smart contracts you can run

```bash
yarn compile
```

To recompile the smart contracts.

> Running `yarn compile` will also re-generate the typechain helpers

> In some cases you may need to clean previously built artifacts, if you run into errors you can try running `yarn build` which will clean and re-compile the smart contracts

### Linting

You can lint any Solidity and TypeScript files in the project by running:

```bash
yarn lint
```

Many linting issues can be solved automatically by running:

```bash
yarn fix
```

> Ensure you run both `yarn fix` and `yarn lint` before creating a pull request.

> You may get some line-ending errors, this project expects that line-endings are LF and not CRLF.

## Generating Merkle Trees

Both the `MerkleTokenAirdrop` and `MerkleTokenVesting` contracts require a valid Merkle Tree to run properly.

### Merkle Tree Concept

If you aren't familiar with Merkle Tree's as a concept, check out these resources:

- Wikipedia: [https://en.wikipedia.org/wiki/Merkle_tree](https://en.wikipedia.org/wiki/Merkle_tree)
- ERC20 Snapshot with Merkle Trees: [https://medium.com/coinmonks/erc20-snapshot-using-merkle-trees-aeeac48ce925](https://medium.com/coinmonks/erc20-snapshot-using-merkle-trees-aeeac48ce925)
- Merkling in Ethereum: [https://medium.com/coinmonks/erc20-snapshot-using-merkle-trees-aeeac48ce925](https://medium.com/coinmonks/erc20-snapshot-using-merkle-trees-aeeac48ce925)

Without explaining how the concept works, and instead what it enables, consider this statement:

> We can use a Merkle Tree to distribute tokens to thousands of addresses with minimal gas costs.
> 
> We create a Merkle Tree out of a list of all the addresses we need to send tokens to, each address is a node in this tree.
> A `Merkle Root` is also created when we make this tree, we must store this root in our smart contract.
> 
> Using the smart contract, a user an make a call, with the data from their node on the Merkle Tree we created. 
> Through a mathematical operation, we can verify that the data from the node is valid (part of the tree) by using the `Merkle Root` in the smart contract.
> 
> After verifying the data, we can distribute tokens.
> 
> In short:
> - We make a `Merkle Tree` which has a root key, and child keys
> - We deploy a smart contract which only stores the root key
> - Users can call the smart contract with a child key
> - The child key is verified against the root key using 'math'
> - If verification is successful, we distribute tokens
>   - We also store a flag indicating that a child key has been used so it can't be used twice
> 
> One important feature of a `Merkle Tree` is that **any** data can be stored in the tree on a child key.
> This allows us to store a user address and an owed amount inside of a child key.

### Generating Merkle Trees

There are two different types of Merkle Trees used in this project, `Airdrop` and `Vesting`.

The `MerkleTokenAirdrop` uses `Airdrop` trees and `MerkleTokenVesting` uses `Vesting` trees.
You can find examples of these trees in the `./merkle/airdrop/example-merkleTree.json` and `./merkle/vesting/example-merkleTree.json` files.

There are scripts to generate both of these types of Merkle Trees in this project.

### Create Input file

To create a Merkle Tree you must create an input json file:

It is recommended you create this file in the `./merkle/<type>/` directory where `<type>` is the type of tree you are making.

#### For Vesting Trees

The json file should follow this schema:

```json
{
  "<account address>": {
    "amount": number,
    "revocable": boolean
  }
}
```

Where:

-  `<account address>` is the string of the account address (ie: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
-  `amount` is the number of tokens to be vested (ie: `5000`)
   -  *Note: You most likely will need to pad zeros to account for the decimal places in ERC20 tokens [more info here](https://forum.openzeppelin.com/t/understanding-decimals-for-erc20-token-creation/1821)*
- `revocable` whether this vesting award is revocable

You can have as many addresses as you want in this file.

#### For Airdrop Trees

The json file should follow this schema:

```json
{
  "<account address>": {
    "amount": number
  }
}
```

Where:

-  `<account address>` is the string of the account address (ie: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`)
-  `amount` is the number of tokens to be air dropped (ie: `5000`)
   -  *Note: You most likely will need to pad zeros to account for the decimal places in ERC20 tokens [more info here](https://forum.openzeppelin.com/t/understanding-decimals-for-erc20-token-creation/1821)*

You can have as many addresses as you want in this file.

### Generate Tree

To generate a merkle tree you can run the following command:

```bash
yarn merkle generate <type> <input file>
```

Where:

- `<type>` is the type of merkle tree (`vesting` or `airdrop`)
- `<input file>` is the path to the input file (ie: `"./merkle/vesting/example.json"`)

This will generate and output a json file in the same directory and name as the input file but with `-merkleTree` appended on the end of the filename.

> Given the input `"./merkle/vesting/example.json"` the generate command will output `"./merkle/vesting/example-merkleTree.json"`

### Verifying Merkle Tree Files

In case you wish to verify that a Merkle Tree has been properly generated, you can use the following command to verify the tree:

```bash
yarn merkle verify <type> <merkle tree file>
```

Where:

- `<type>` is the type of merkle tree (`vesting` or `airdrop`)
- `<merkle tree file>` is the path to the merkle tree file (ie: `"./merkle/vesting/example-merkleTree.json"`)

> **Use the `XXX-merkleTree.json` file here instead of the input file**

## Deployment

You can use the `yarn hardhat deploy` task to deploy contracts.

Information about deployments are stored in the `deployments/` folder where the name of the file is the network you deployed to.

### Deploying Token Contract

Run the this command to deploy a token contract:

```
yarn hardhat deploy token --tag "<tag>" --name "<name>" --symbol "<symbol>" --network <network>
```

Where:

- `<tag>` is a user friendly tag (used in the deployment file)
- `<name>` is the token name to be used
- `<symbol>` is the token symbol to be used
- `<network>` is the network to deploy to

### Deploying Merkle Token Airdrop Contract

Run the this command to deploy a Merkle Token Airdrop contract:

```
yarn hardhat deploy airdrop --tag "<tag>" --merkle "<merkle file>" --token "<token>"
```

Where:

- `<tag>` is a user friendly tag (used in the deployment file)
- `<merkle file>` is the path to the merkle file to use
- `<token>` is the address of the token that is being airdropped

You will need to transfer the proper quantity of tokens to the contract once it has been deployed so users can claim their tokens.

> Make sure that `<merkle_file>` is a path to a JSON file which is the proper type (*airdrop*, not vesting)  
> You can find `<token>` (the address) in the deployment file if you deployed a token wih the deployment scripts

### Deploying Merkle Token Vesting Contract

Run the this command to deploy a Merkle Token Airdrop contract:

```
yarn hardhat deploy vesting --tag "<tag>" --merkle "<merkle file>" --token "<token>" --start <start> --duration <duration> --cliff <cliff>
```

Where:

- `<tag>` is a user friendly tag (used in the deployment file)
- `<merkle file>` is the path to the merkle file to use
- `<token>` is the address of the token that is being airdropped
- `<start>` is what block number vesting should start on
- `<duration>` is how many blocks until all tokens are vested (linearly)
- `<cliff>` is how many blocks until the vesting cliff is reached

You will need to transfer the proper quantity of tokens to the contract once it has been deployed so users can claim their tokens.

> Make sure that `<merkle_file>` is a path to a JSON file which is the proper type (*vesting*, not airdrop)  
> You can find `<token>` (the address) in the deployment file if you deployed a token wih the deployment scripts

## Open Zeppelin Modifications

A slightly modified version of the ERC20 Open Zeppelin Contracts are used in this project.
For more information check [this file](./contracts/oz/README.md).

These modifications have been deemed minor, so no additional tests have been written for the contracts in the `./contracts/oz` folder.
