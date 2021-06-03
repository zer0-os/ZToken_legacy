# Merkle Token Airdrop Contract

The Merkle Airdrop Contract is built to "airdrop" a large number of users.

It utilizes Merkle Trees to distribute tokens to a large quantity of users with minimal gas costs.

## Intended Usage

zToken may need to be given to a large number of users, this contract provides a way to distribute tokens to a large number of users at a minimal gas cost to the sender, and requires the claimer to spend gas to claim the tokens.

## Specifications

This is a list of feature specifications, it will attempt to describe each fundamental feature and any requirements around them.

### Merkle Tree for Claiming Tokens

So that tokens can be "air dropped" to many accounts a Merkle Tree must be used to define what accounts are entitled what amount of tokens.

Each airdrop is defined in the Merkle Tree must have the following parameters:

- `account`: What account (address) is this airdrop for
- `amount`: How many tokens are given to the account

A Merkle Tree Root must be set on contract creation.

### Claiming Tokens

A user must call a method on the contract to "claim" their tokens.

Calls are validated using the Merkle Tree.

Each token claim can only be claimed once.

Users are able to claim for another user, but the tokens will still be given to the user who it belongs to (the other user).
