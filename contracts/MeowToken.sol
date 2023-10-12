// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

// Slight modifiations from base Open Zeppelin Contracts
// Consult /oz/README.md for more information
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20PausableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/extensions/ERC20SnapshotUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract MeowToken is OwnableUpgradeable, ERC20Upgradeable, ERC20PausableUpgradeable, ERC20SnapshotUpgradeable
{
  event AuthorizedSnapshotter(address account);
  event DeauthorizedSnapshotter(address account);

  // Mapping which stores all addresses allowed to snapshot
  mapping(address => bool) authorizedToSnapshot;

  function initialize(string memory name, string memory symbol, uint amount)
  public
  initializer
  {
    __Ownable_init();
    __ERC20_init(name, symbol);
    __ERC20Snapshot_init();
    __ERC20Pausable_init();
  }

  /**
   * Utility function to transfer tokens to many addresses at once.
   * @param recipients The addresses to send tokens to
   * @param amount The amount of tokens to send
   * @return Boolean if the transfer was a success
   */
  function transferBulk(address[] calldata recipients, uint256 amount)
  external
  returns (bool)
  {
    require(amount > 0, "MeowToken: amount must be greater than 0");
    address sender = _msgSender();
    uint256 length = recipients.length;

    for (uint256 i = 0; i < length; ++i) {
      address recipient = recipients[i];
      _transfer(sender, recipient, amount);
    }
    return true;
  }

  /**
   * Utility function to transfer tokens to many addresses at once.
   * @param sender The address to send the tokens from
   * @param recipients The addresses to send tokens to
   * @param amount The amount of tokens to send
   * @return Boolean if the transfer was a success
   */
  function transferFromBulk(
    address sender,
    address[] calldata recipients,
    uint256 amount
  ) external returns (bool) {
    require(amount > 0, "MeowToken: amount must be greater than 0");

    uint256 length = recipients.length;
    for (uint256 i = 0; i < length; ++i) {
      address recipient = recipients[i];
      transferFrom(sender, recipient, amount);
    }
    return true;
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
  {}

  function _afterTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal virtual override {
    if (to == address(this)) { //token were sent to this address, we need to burn them
      _burn (to, amount); // burn from the contract itself.
    }
  }
}
