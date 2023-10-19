// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {IERC20} from "@openzeppelin/contracts-400/token/ERC20/IERC20.sol";

interface IZeroToken is IERC20 {
  function snapshot() external returns (uint256);
}
