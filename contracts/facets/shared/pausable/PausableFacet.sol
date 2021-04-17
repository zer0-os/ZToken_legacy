// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {LibPausableStorage} from "./LibPausableStorage.sol";
import {LibPausable} from "./LibPausable.sol";
import {PausableModifiers} from "./PausableModifiers.sol";

contract PausableFacet is PausableModifiers {
  function paused() external view virtual returns (bool) {
    return LibPausableStorage.pausableStorage().paused;
  }

  /**
   * @dev Triggers stopped state.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  function _pause() internal virtual whenNotPaused {
    LibPausable.pause();
  }

  /**
   * @dev Returns to normal state.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  function _unpause() internal virtual whenPaused {
    LibPausable.unpause();
  }
}
