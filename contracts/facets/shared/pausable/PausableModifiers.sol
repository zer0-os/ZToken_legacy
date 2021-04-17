// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {LibPausableStorage} from "./LibPausableStorage.sol";

contract PausableModifiers {
  /**
   * @dev Modifier to make a function callable only when the contract is not paused.
   *
   * Requirements:
   *
   * - The contract must not be paused.
   */
  modifier whenNotPaused() {
    require(!LibPausableStorage.pausableStorage().paused, "Pausable: paused");
    _;
  }

  /**
   * @dev Modifier to make a function callable only when the contract is paused.
   *
   * Requirements:
   *
   * - The contract must be paused.
   */
  modifier whenPaused() {
    require(
      LibPausableStorage.pausableStorage().paused,
      "Pausable: not paused"
    );
    _;
  }
}
