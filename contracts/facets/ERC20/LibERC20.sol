// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {LibERC20Storage} from "./LibERC20Storage.sol";
import {LibPausableStorage} from "../shared/pausable/LibPausableStorage.sol";
import {Arrays} from "@openzeppelin/contracts/utils/Arrays.sol";
import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

library LibERC20 {
  using Counters for Counters.Counter;
  using Arrays for uint256[];

  // Need to include events locally because `emit Interface.Event(params)` does not work
  event Transfer(address indexed from, address indexed to, uint256 amount);

  function mint(address to, uint256 amount) internal {
    require(to != address(0), "INVALID_TO_ADDRESS");

    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    es.balances[to] = es.balances[to] + amount;
    es.totalSupply = es.totalSupply + amount;
    emit Transfer(address(0), to, amount);
  }

  function burn(address from, uint256 amount) internal {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    es.balances[from] = es.balances[from] - amount;
    es.totalSupply = es.totalSupply - amount;
    emit Transfer(from, address(0), amount);
  }

  /**
   * @dev Retrieves the balance of `account` at the time `snapshotId` was created.
   */
  function balanceOfAt(address account, uint256 snapshotId)
    internal
    view
    returns (uint256)
  {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();
    (bool snapshotted, uint256 value) =
      valueAt(snapshotId, es.accountBalanceSnapshots[account]);

    return snapshotted ? value : es.balances[account];
  }

  /**
   * @dev Retrieves the total supply at the time `snapshotId` was created.
   */
  function totalSupplyAt(uint256 snapshotId) internal view returns (uint256) {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();
    (bool snapshotted, uint256 value) =
      valueAt(snapshotId, es.totalSupplySnapshots);

    return snapshotted ? value : es.totalSupply;
  }

  function valueAt(
    uint256 snapshotId,
    LibERC20Storage.Snapshots storage snapshots
  ) private view returns (bool, uint256) {
    require(snapshotId > 0, "ERC20Snapshot: id is 0");

    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    // solhint-disable-next-line max-line-length
    require(
      snapshotId <= es.currentSnapshotId.current(),
      "ERC20Snapshot: nonexistent id"
    );

    // When a valid snapshot is queried, there are three possibilities:
    //  a) The queried value was not modified after the snapshot was taken. Therefore, a snapshot entry was never
    //  created for this id, and all stored snapshot ids are smaller than the requested one. The value that corresponds
    //  to this id is the current one.
    //  b) The queried value was modified after the snapshot was taken. Therefore, there will be an entry with the
    //  requested id, and its value is the one to return.
    //  c) More snapshots were created after the requested one, and the queried value was later modified. There will be
    //  no entry for the requested id: the value that corresponds to it is that of the smallest snapshot id that is
    //  larger than the requested one.
    //
    // In summary, we need to find an element in an array, returning the index of the smallest value that is larger if
    // it is not found, unless said value doesn't exist (e.g. when all values are smaller). Arrays.findUpperBound does
    // exactly this.

    uint256 index = snapshots.ids.findUpperBound(snapshotId);

    if (index == snapshots.ids.length) {
      return (false, 0);
    } else {
      return (true, snapshots.values[index]);
    }
  }
}
