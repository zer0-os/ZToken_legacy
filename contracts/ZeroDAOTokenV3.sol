// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

// Slight modifiations from base Open Zeppelin Contracts
// Consult /oz/README.md for more information
import "./oz/ERC20Upgradeable.sol";
import "./oz/ERC20SnapshotUpgradeable.sol";
import "./oz/ERC20PausableUpgradeable.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

contract ZeroDAOTokenV3 is
  OwnableUpgradeable,
  ERC20Upgradeable,
  ERC20PausableUpgradeable,
  ERC20SnapshotUpgradeable
{
  using SafeERC20 for IERC20;

  event AuthorizedSnapshotter(address account);
  event DeauthorizedSnapshotter(address account);
  event ERC20TokenWithdrawn(
    IERC20 indexed token,
    address indexed to,
    uint256 indexed amount
  );

  // Mapping which stores all addresses allowed to snapshot
  mapping(address => bool) authorizedToSnapshot;

  function initialize(
    string memory name,
    string memory symbol
  ) public initializer {
    __ERC20_init(name, symbol);
  }

  // Call this on the implementation contract (not the proxy)
  function initializeImplementation() public initializer {}

  /**
   * Utility function to transfer tokens to many addresses at once.
   * @param recipients The addresses to send tokens to
   * @param amount The amount of tokens to send
   * @return Boolean if the transfer was a success
   */
  function transferBulk(
    address[] calldata recipients,
    uint256 amount
  ) external returns (bool) {
    address sender = _msgSender();

    uint256 total = amount * recipients.length;
    require(
      _balances[sender] >= total,
      "ERC20: transfer amount exceeds balance"
    );

    _balances[sender] -= total;

    for (uint256 i = 0; i < recipients.length; ++i) {
      address recipient = recipients[i];
      require(recipient != address(0), "ERC20: transfer to the zero address");

      // Note: _beforeTokenTransfer isn't called here
      // This function emulates what it would do

      _balances[recipient] += amount;

      emit Transfer(sender, recipient, amount);
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
    uint256 total = amount * recipients.length;
    require(
      _balances[sender] >= total,
      "ERC20: transfer amount exceeds balance"
    );

    // Ensure enough allowance
    uint256 currentAllowance = _allowances[sender][_msgSender()];
    require(
      currentAllowance >= total,
      "ERC20: transfer total exceeds allowance"
    );
    _approve(sender, _msgSender(), currentAllowance - total);

    _balances[sender] -= total;

    for (uint256 i = 0; i < recipients.length; ++i) {
      address recipient = recipients[i];
      require(recipient != address(0), "ERC20: transfer to the zero address");

      // Note: _beforeTokenTransfer isn't called here
      // This function emulates what it would do (paused and snapshot)

      _balances[recipient] += amount;

      emit Transfer(sender, recipient, amount);
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
  {
    super._beforeTokenTransfer(from, to, amount);
  }

  function _transfer(
    address from,
    address to,
    uint256 amount
  ) internal override {
    super._transfer(from, to, amount);

    if (to == address(this)) {
      _burn(to, amount);
    }
  }
}
