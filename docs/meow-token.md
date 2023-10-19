# MeowToken Contract

The MeowToken is both a general purpose ERC20 token and a token designed for usage in Meow DAO's.

Many copies of this token may be deployed in the future (one for each DAO) and as such the token contract needs to be safe and easy to use.

## Intended Usage

A MeowToken is used to represent ownership of a DAO inside of Meow.
Users who own a MeowToken have privileges granted by the DAO.
One of these privileges may be voting rights on proposals.
The weight of a users vote is determined by the quantity of tokens they own versus the total supply of tokens.
Token will also be used in `zNS` system developed by Zero and will be the main asset for purchasing Root Domains
through staking on the `zNS` platform.

## Specification

This is a list of feature specifications, it will attempt to describe each fundamental feature and any requirements around them.

### ERC20 Token

The token needs to implement the [ERC20 Token Standard](https://eips.ethereum.org/EIPS/eip-20).

### Transfer

A user who owns MeowTokens should be able to transfer their tokens to another account or wallet.

### Upgradable

The original token contract named `ZeroToken` was deployed as a Transparent Upgradeable Proxy.
When changing to `MeowToken`, contract has been upgraded twice to achieve the final stage and remove
some unnecessary functionality and to change the name and symbol of the token. After the final upgrade
contract stops being upgradeable through `renounceOwnership()` method on it's `ProxyAdmin` contract.
Even though MeowToken stays a Transparent Proxy, it will be impossible to upgrade, since it will have no owner
who is the only entity that can upgrade the contract. So, effectively, MeowToken is not upgradeable
after the ownerhip of it's `ProxyAdmin` is renounced.

### Bulk Transfer

The ability to transfer tokens from one account to many accounts with a single transaction is required to save on gas.

Besides that a new feature is added where transferring tokens to the address of the token contract itself
will burn these tokens from the `totalSupply`. This should be clearly stated in the docs and UI and some
measures should be added that warn people about the fact that they are burning tokens if specifying the incorrect address.

### Ownable

The contract was previously own-able, but the current implementation aim to remove ownership methods and after the upgrade will happen on the mainnet the renounceOwnership() method will be called 
