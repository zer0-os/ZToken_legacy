# zToken Contract

The zToken is both a general purpose ERC20 token and a token designed for usage in Zer0 DAO's.

Many copies of this token may be deployed in the future (one for each DAO) and as such the token contract needs to be safe and easy to use.

## Intended Usage

A zToken is used to represent ownership of a DAO inside of Zer0.
Users who own a zToken have privileges granted by the DAO.
One of these privileges may be voting rights on proposals.
The weight of a users vote is determined by the quantity of tokens they own versus the total supply of tokens.


## Specification

This is a list of feature specifications, it will attempt to describe each fundamental feature and any requirements around them.

### ERC20 Token

The token needs to implement the [ERC20 Token Standard](https://eips.ethereum.org/EIPS/eip-20).

### Transfer

A user who owns zTokens should be able to transfer their tokens to another account or wallet.

### Pauseable

The zToken administrator (owner of the zToken contract) should be able to freeze and unfreeze token transactions.

Freezing of token transactions will prevent:

- Tokens from being transferred
- Tokens from being bought or sold
-  New tokens from being created

### Upgradable

It is likely that additional functionality may be required of a zToken in the future. 
Therefore the zToken contracts should be upgradable to allow for functionality improvements without a token migration.

### Balance Snapshotting

Voting on a zDAO proposal may not require tokens to be ‘spent’ or ‘locked’ thus allowing a user to vote and then transfer their tokens before the vote has passed.

As such, the weight of a users vote must not change during the duration of a proposal. If it were changeable then it would be possible for a user to vote on a proposal, transfer their tokens, then vote a second time on the same proposal.

To prevent this balance snapshotting must be implemented, which will snapshot a users balances when a snapshot is taken. zDAO can therefore use a users token balance at the start time of a proposal to determine voting weight.

Authorized users, such as the owner, or "snapshotters" are allowed to call a `snapshot` method which will take a snapshot of user balances.
This `snapshot` method returns the taken snapshot id which can be used to retrieve the balances at that snapshot.

### Bulk Transfer

The ability to transfer tokens from one account to many accounts with a single transaction is required to save on gas.

### Ownable

The owner of the token contract has the ability to mint and burn tokens.  
The intended owner of this token is a Zer0 DAO.
