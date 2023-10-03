// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "./ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ArraysUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

/**
 * @dev This contract extends an ERC20 token with a snapshot mechanism. When a snapshot is created, the balances and
 * total supply at the time are recorded for later access.
 *
 * This can be used to safely create mechanisms based on token balances such as trustless dividends or weighted voting.
 * In naive implementations it's possible to perform a "double spend" attack by reusing the same balance from different
 * accounts. By using snapshots to calculate dividends or voting power, those attacks no longer apply. It can also be
 * used to create an efficient ERC20 forking mechanism.
 *
 * Snapshots are created by the internal {_snapshot} function, which will emit the {Snapshot} event and return a
 * snapshot id. To get the total supply at the time of a snapshot, call the function {totalSupplyAt} with the snapshot
 * id. To get the balance of an account at the time of a snapshot, call the {balanceOfAt} function with the snapshot id
 * and the account address.
 *
 * ==== Gas Costs
 *
 * Snapshots are efficient. Snapshot creation is _O(1)_. Retrieval of balances or total supply from a snapshot is _O(log
 * n)_ in the number of snapshots that have been created, although _n_ for a specific account will generally be much
 * smaller since identical balances in subsequent snapshots are stored as a single entry.
 *
 * There is a constant overhead for normal ERC20 transfers due to the additional snapshot bookkeeping. This overhead is
 * only significant for the first transfer that immediately follows a snapshot for a particular account. Subsequent
 * transfers will have normal cost until the next snapshot, and so on.
 */
abstract contract ERC20SnapshotUpgradeable is Initializable, ERC20Upgradeable {
  function __ERC20Snapshot_init() internal initializer {
    __Context_init_unchained();
    __ERC20Snapshot_init_unchained();
  }

  function __ERC20Snapshot_init_unchained() internal initializer {}

  // Inspired by Jordi Baylina's MiniMeToken to record historical balances:
  // https://github.com/Giveth/minimd/blob/ea04d950eea153a04c51fa510b068b9dded390cb/contracts/MiniMeToken.sol

  using ArraysUpgradeable for uint256[];
  using CountersUpgradeable for CountersUpgradeable.Counter;

  // Snapshotted values have arrays of ids and the value corresponding to that id. These could be an array of a
  // Snapshot struct, but that would impede usage of functions that work on an array.
  struct Snapshots {
    uint256[] ids;
    uint256[] values;
  }

  mapping(address => Snapshots) private _accountBalanceSnapshots;
  Snapshots private _totalSupplySnapshots;

  // Snapshot ids increase monotonically, with the first value being 1. An id of 0 is invalid.
  CountersUpgradeable.Counter private _currentSnapshotId;

  /**
   * @dev Emitted by {_snapshot} when a snapshot identified by `id` is created.
   */
  event Snapshot(uint256 id);

  // Update balance and/or total supply snapshots before the values are modified. This is implemented
  // in the _beforeTokenTransfer hook, which is executed for _mint, _burn, and _transfer operations.
  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    super._beforeTokenTransfer(from, to, amount);
  }


  uint256[46] private __gap;
}
