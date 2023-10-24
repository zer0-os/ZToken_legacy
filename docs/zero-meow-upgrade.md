# Upgrade Process for MEOW Token

## Ethereum Mainnet
1. [test step] Send a single approval transaction to populate state of the existing token.
2. [upgrade step] Deploy new implementation contract `MeowToken.sol` using script `scripts/02_deployMeowImpl.ts`
3. [upgrade step] Create a proposal in OpenZeppelin Defender to upgrade the token proxy contract to the newly deployed implementation. Proposal will go through the multisig.
4. [test step] Run the test script `scripts/03_confirmValues.ts` to test 4 main things:
   1. `transferBulk()` works as expected moving funds from existing token holder to other wallets
   2. `transferFromBulk()` works as expected moving funds from existing token holder to other wallets while using recent (post upgrade) approvals
   3. `transferFromBulk()` works as expected moving funds from existing token holder to other wallets while using previous (pre-upgrade) approval created in the step #1
   4. both `transferBulk()` and `transferFromBulk()` burn the amount of tokens sent to the address of the Token Proxy contract from the `totalSupply`
5. [upgrade step] Once token functionality is validated after the upgrade, we proceed to "remove the token upgradability" by:
   1. Calling the `ProxyAdmin.renounceOwnership()` to remove the ability to call `upgrade` for any account in the future.
6. (Alternative to step 5!) Call the current `ProxyAdmin.changeProxyAdmin()` to some other dead address that is not owned by anyone and is not the zero address, therefore removing the need for the new `ProxyAdmin` altogether.

> Q: Which of the approaches between #5 and #6 is better? If #6 is better, which address should we use that is safe to assume will never be owned by anyone?
> It can't be 0x0 address. Can it be 0xdead or some other?

## Ethereum Sepolia Testnet Run
For this run we performed the same steps as for Mainnet, except we deployed the original `ZeroToken` first so we have a token to upgrade. Additionally, a mint of tokens occurs to the main account that is used in tests so we have funds to transfer back and forth.

You can find the scripts in the `scripts/` root directory.

## Running the Scripts
To run any of the scripts files you must first include the used private keys in a `.env` file at the root of this repository that will link to the account(s) used in ownership and token transfers.

```
# .env
PRIVATE_KEY=<private key for mainnet account>
PRIVATE_KEY_A=<private key for test account A>
PRIVATE_KEY_B=<private key for test account B>
PRIVATE_KEY_C=<private key for test account C>
PRIVATE_KEY_D=<private key for test account D>
```

Then you can run the scripts using the terminal command below. By default, hardhat is the network that's used and scripts may fail if they expect certain state to exist, such as the ZERO contract already being deployed.

You can specify the network using the `--network <network-name>` argument.

```bash
$ yarn hardhat run scripts/<script-name> [--network <network-name>]
```

For example, running on the Sepolia test network would first require the deployment of ZERO and minting of tokens

```
yarn hardhat run scripts/01_deployZero.ts --network sepolia
```

Then you would also run the script to perform transactions and write out the values.

```
yarn hardhat run scripts/03_confirmValues.ts --network sepolia
```

After this runs successfully it will generate a `preUpgradeTokenValues.json` file located at the root of this repository. Once you've completed these two steps, you can modify the address of the ZERO token in the upgrade script `scripts/04_upgradeZero.ts` to be the newly deployed address and then run it similar to the above. 

Before running `03_confirmValues` again, you must also change some variable names internally. This includes the token address, token name, and output file name. When this is run a `postUpgradeTokenValues.json` will be generated. Use this to confirm that transfers work as expected, and that total supply of the MEOW token is reduced by the expected amount after performing a transfer to the token contract address.
