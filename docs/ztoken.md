# MeowToken Contract

The MeowToken is both a general purpose ERC20 token and a token designed for usage in Meow DAO's.

Many copies of this token may be deployed in the future (one for each DAO) and as such the token contract needs to be safe and easy to use.

## Intended Usage

A MeowToken is used to represent ownership of a DAO inside of Meow.
Users who own a MeowToken have privileges granted by the DAO.
One of these privileges may be voting rights on proposals.
The weight of a users vote is determined by the quantity of tokens they own versus the total supply of tokens.


## Specification

This is a list of feature specifications, it will attempt to describe each fundamental feature and any requirements around them.

### ERC20 Token

The token needs to implement the [ERC20 Token Standard](https://eips.ethereum.org/EIPS/eip-20).

### Transfer

A user who owns MeowTokens should be able to transfer their tokens to another account or wallet.

### Upgradable

It is likely that additional functionality may be required of a MeowToken in the future. 
Therefore the MeowToken contracts should be upgradable to allow for functionality improvements without a token migration.

### Bulk Transfer

The ability to transfer tokens from one account to many accounts with a single transaction is required to save on gas.

### Ownable

The contract was previously own-able, but the current implementation aim to remove ownership methods and after the upgrade will happen on the mainnet the renounceOwnership() method will be called 
