// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import {LibDiamond} from "./LibDiamond.sol";

struct AppStorage {
  bool gap;
}

library LibAppStorage {
  function diamondStorage() internal pure returns (AppStorage storage ds) {
    assembly {
      ds.slot := 0
    }
  }
}
