// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";

contract ZDAOToken is
  OwnableUpgradeable,
  ERC20Upgradeable,
  ERC20PausableUpgradeable,
  ERC20SnapshotUpgradeable
{
  function initialize(string memory name, string memory symbol)
    public
    initializer
  {
    __Ownable_init();
    __ERC20_init(name, symbol);
    __ERC20Snapshot_init();
    __ERC20Pausable_init();
  }

  function mint(address account, uint256 amount) external onlyOwner {
    _mint(account, amount);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  )
    internal
    virtual
    override(
      ERC20PausableUpgradeable,
      ERC20SnapshotUpgradeable,
      ERC20Upgradeable
    )
  {
    super._beforeTokenTransfer(from, to, amount);
  }
}
