# Merkle Token Vesting Contract

The Merkle Vesting contract is built to "airdrop vesting tokens" to a large number of users.

It utilizes Merkle Trees to distribute tokens to a large quantity of users with minimal gas costs.

## Intended Usage

zToken will need to be given to a large number of users, vesting over a period of time.
This contract serves two purposes:

- To give "vesting" tokens to a large number of wallets at once
- To release tokens to users according to a "vesting schedule"

## Concepts

Understanding these concepts will help with understanding of specifications.

### Ownable

The Merkle Token Vesting contract is owned by a single address.

This owner is the 'admin' of the contract.

### Vesting Tokens

Vesting Tokens are owed to an account (address/wallet) but are not released immediately but instead according to a vesting schedule.

This concept of being owed tokens, and being given them after a period of time is "vesting."

Once the period of time has passed, a token has "vested" and can be released by the contract to the user.

### Vesting Schedule

A vesting schedule is a gradual release of many tokens to an account over time.

A schedule will define how many tokens are released per unit of time.

> For example: a schedule may indicate that 365 tokens are to be linearly "vested" over 1 year. This would mean that one token would be "vested" every day for one year.

Schedules can also define delayed starts.

> Only start vesting tokens after 3 months

Schedules can also define a [vesting cliff](https://blog.thehub.io/wp-content/uploads/2019/08/Artboard-1-copy-3StartupValuation-1024x796.png) where no tokens are released until the cliff has been reached.
This can be used in tandem with a delayed start.

### Vesting Token Award

A "Vesting Token Award" or "Award" are vesting tokens given to an account.

## Specification

This is a list of feature specifications, it will attempt to describe each fundamental feature and any requirements around them.

### Merkle Tree for Giving Awards

So that many Vesting Token Awards can be given to many different accounts, a Merkle Tree must be used to define what accounts are entitled what awards.

Each award defined in the Merkle Tree must have the following parameters:

- `account`: What account (address) is this award for
- `amount`: How many vested tokens are given to the account
- `revocable`: Whether or not unvested tokens can be revoked from the account (See the *Revocable Awards* specification for more information)

A Merkle Tree Root must be set on contract creation.

### Claiming Vesting Token Awards

A user must call a method on the contract to "claim" their Vesting Token Award.

Calls are validated using the Merkle Tree.

Upon claiming the Vesting Token Award, they are eligible to start receiving their vested tokens.

Users can only claim their Vesting Token Award once.

Users are able to claim a Vesting Token Award for another user, but the award will still be awarded to the user who it belongs to (the other user).

### One Vesting Schedule per Contract Instance

Each Merkle Token Vesting contract only has **one** vesting schedule.

### Vesting Schedule Parameters

The Merkle Token Vesting contract only supports **linearly** vesting.

It has the following parameters:

- `start`: The block number to start vesting on, this can be in the past or future
- `duration`: How long until all of an award's tokens have vested (in blocks)
- `cliff`: How long until the cliff is reached for vesting (can be zero)

> `duration` must be greater than `cliff`

### Vesting Cliff

A vesting cliff must be configurable.

A vesting cliff means that even if the `start` block has been reached, no tokens will be vested until the cliff has been reached.

The vesting cliff is at block(`start + cliff`) and must happen before the end, block(`start + duration`)

> To better understand vesting cliffs, imagine that a vesting schedule is as such:
> 
> - Begin vesting on block `100`
> - Cliff is `50` blocks 
> - Duration is `100` blocks
>
> Given this scenario: 
> - At block `90` 0% of the tokens have vested.
> - at block `101` 0% of the tokens have vested.
> - At block `149` 0% of the tokens have vested.
> - At block `150` 50% of the tokens have vested.
> - At block `200` 100% of the tokens have vested.

The cliff is useful to provide a large amount of tokens all at once, then a smaller quantity per block.

### Revocable Vesting Token Awards

Some Vesting Token Awards may be conditional and need to be taken away given certain circumstances.

The Merkle Token Vesting contract allows for Vesting Token Awards to be revoked from an account if the Token Award is marked as 'revocable' in the Merkle Tree.

If a Token Award is revoked then the following happens:

- All currently **vested** tokens are **given** to the awardee (account.)
- All currently **unvested** tokens are "refunded" to the owner of the Merkle Token Vesting contract.
- The Award is voided, no more tokens will be vested.

Only the owner (admin) of the Merkle Token Vesting contract may revoke tokens awards.
Once an award has been revoked, it cannot be revoked again.

### Upgradable

Since a large number of tokens may be stored in the contract, this contract is upgradable in case a critical bug or vulnerability is discovered.
