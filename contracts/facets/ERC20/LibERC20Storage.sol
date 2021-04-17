// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";

library LibERC20Storage {
  using Counters for Counters.Counter;

  bytes32 constant ERC_20_STORAGE_POSITION =
    keccak256("zer0.storage.dao.erc20.v1");

  struct Snapshots {
    uint256[] ids;
    uint256[] values;
  }

  struct ERC20Storage {
    string name;
    string symbol;
    uint256 totalSupply;
    mapping(address => uint256) balances;
    mapping(address => mapping(address => uint256)) allowances;
    mapping(address => Snapshots) accountBalanceSnapshots;
    Snapshots totalSupplySnapshots;
    Counters.Counter currentSnapshotId;
  }

  function erc20Storage() internal pure returns (ERC20Storage storage es) {
    bytes32 position = ERC_20_STORAGE_POSITION;
    assembly {
      es.slot := position
    }
  }
}
