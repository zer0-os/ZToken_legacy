// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

library LibPausableStorage {
  bytes32 constant PAUSABLE_STORAGE_POSITION =
    keccak256("zer0.storage.dao.pausable.v1");

  struct PausableStorage {
    bool paused;
  }

  function pausableStorage() internal pure returns (PausableStorage storage s) {
    bytes32 position = PAUSABLE_STORAGE_POSITION;
    assembly {
      s.slot := position
    }
  }
}
