// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {LibMeta} from "../../../libraries/LibMeta.sol";

import {LibPausableStorage} from "./LibPausableStorage.sol";

library LibPausable {
  event Paused(address account);
  event Unpaused(address account);

  function paused() internal view returns (bool) {
    return LibPausableStorage.pausableStorage().paused;
  }

  /**
   * @dev Triggers stopped state.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  function pause() internal {
    LibPausableStorage.pausableStorage().paused = true;
    emit Paused(LibMeta.msgSender());
  }

  /**
   * @dev Returns to normal state.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  function unpause() internal {
    LibPausableStorage.pausableStorage().paused = false;
    emit Unpaused(LibMeta.msgSender());
  }
}
