// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {LibDiamond} from "../../../libraries/LibDiamond.sol";

contract CallProtection {
  modifier protectedCall() {
    require(
      msg.sender == LibDiamond.diamondStorage().contractOwner ||
        msg.sender == address(this),
      "NOT_ALLOWED"
    );
    _;
  }
}
