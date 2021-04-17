// SPDX-License-Identifier: MIT
pragma solidity 0.8.3;

import {LibDiamond} from "./LibDiamond.sol";
import {AppStorage} from "./AppStorage.sol";

contract Modifiers {
  AppStorage internal s;

  modifier onlyOwner {
    LibDiamond.enforceIsContractOwner();
    _;
  }
}
