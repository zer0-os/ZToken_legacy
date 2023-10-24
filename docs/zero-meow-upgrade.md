# Upgrade Process for MEOW Token

## Ethereum Mainnet
1. [test step] Send a single approval transaction to populate state of the existing token.
2. [upgrade step] Deploy new implementation contract `MeowToken.sol`.
3. [upgrade step] Create a proposal in OpenZeppelin Defender to upgrade the token proxy contract to the newly deployed implementation. Proposal will go through the multisig.
4. [test step] Run the test script `scripts/03_confirmValues.ts` to test 4 main things:
   1. `transferBulk()` works as expected moving funds from existing token holder to other wallets
   2. `transferFromBulk()` works as expected moving funds from existing token holder to other wallets while using recent (post upgrade) approvals
   3. `transferFromBulk()` works as expected moving funds from existing token holder to other wallets while using previous (pre upgrade) approval created in the step #1
   4. both `transferBulk()` and `transferFromBulk()` burn the amount of tokens sent to the address of the Token Proxy contract from the `totalSupply`
5. [upgrade step] Once token functionality is validated after the upgrade, we proceed to "remove the token upgradability" by:
   1. Deploying a new `ProxyAdmin.sol` contract just for the Meow Token (current ProxyAdmin is admin for multiple other proxies).
   2. Calling existing `ProxyAdmin` to transfer ownership of the Meow Token Proxy to the new `ProxyAdmin` contract.
   3. Calling the new `ProxyAdmin.renounceOwnership()` to remove the ability to upgrade the Meow Token Proxy for any account in the future.
6. (Alternative to step 5!) Call the current `ProxyAdmin.changeProxyAdmin()` to some other dead address that is not owned by anyone
therefore removing the need for the new `ProxyAdmin` altogether.

> Q: Which of the approaches between #5 and #6 is better? If #6 is better, which address should we use that is safe to assume will never be owned by anyone?
> It can't be 0x0 address. Can it be 0xdead or some other?

## Ethereum Sepolia Testnet Run
For this run we performed the same steps as for Mainnet, besides deploying the original `ZeroToken` first, so we have the token to upgrade,
and giving some funds to the accounts participating in the test.
You can find the scripts run in the `scripts/` root directory.
