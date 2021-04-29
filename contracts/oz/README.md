# Modified Open Zeppelin Contracts

These contracts are slightly modified versions of the base Open Zeppelin contracts.

They are based on `@openzeppelin/contracts-upgradeable` version `4.0.0`

This document serves as a complete list of changes:

## ERC20Upgradeable

- `_balances` is now internal (was private)
- `_allowances` is now internal (was private)

## ERC20PauseableUpgradeable

- `_updateAccountSnapshot` is now internal (was private)
- `_updateTotalSupplySnapshot` is now internal (was private)

