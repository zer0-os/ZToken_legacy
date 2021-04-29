# Merkle Token Airdrop Contract

The Merkle Airdrop Contract is built to "airdrop" a large number of users.

It utilizes Merkle Trees to distribute tokens to a large quantity of users with minimal gas costs.

## Intended Usage

Zer0 DAO Tokens may need to be given to a large number of users, this contract provides a way to distribute tokens to a large number of users at a minimal gas cost to the sender, and requires the claimer to spend gas to claim the tokens.

## Specifications

This is a list of feature specifications, it will attempt to describe each fundamental feature and any requirements around them.

### Merkle Tree for Giving Awards

So that many Vesting Token Awards can be given to many different accounts, a Merkle Tree must be used to define what accounts are entitled what awards.

Each award defined in the Merkle Tree must have the following parameters:

- `account`: What account (address) is this award for
- `amount`: How many vested tokens are given to the account
- `revocable`: Whether or not unvested tokens can be revoked from the account (See the *Revocable Awards* specification for more information)

A Merkle Tree Root must be set on contract creation.

### Claiming Vesting Token Awards

