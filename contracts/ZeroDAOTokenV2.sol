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

contract ZeroDAOTokenV2 is
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
    __Ownable_init();
    __ERC20_init(name, symbol);
    __ERC20Snapshot_init();
    __ERC20Pausable_init();
  }

  // Call this on the implementation contract (not the proxy)
  function initializeImplementation() public initializer {
    __Ownable_init();
    _pause();
  }

  /**
   * Pauses the token contract preventing any token mint/transfer/burn operations.
   * Can only be called if the contract is unpaused.
   */
  function pause() external onlyOwner {
    _pause();
  }

  /**
   * Unpauses the token contract preventing any token mint/transfer/burn operations
   * Can only be called if the contract is paused.
   */
  function unpause() external onlyOwner {
    _unpause();
  }

  /**
   * Creates a token balance snapshot. Ideally this would be called by the
   * controlling DAO whenever a proposal is made.
   */
  function snapshot() external returns (uint256) {
    require(
      authorizedToSnapshot[_msgSender()] || _msgSender() == owner(),
      "zDAOToken: Not authorized to snapshot"
    );
    return _snapshot();
  }

  /**
   * Authorizes an account to take snapshots
   * @param account The account to authorize
   */
  function authorizeSnapshotter(address account) external onlyOwner {
    require(
      !authorizedToSnapshot[account],
      "zDAOToken: Account already authorized"
    );

    authorizedToSnapshot[account] = true;
    emit AuthorizedSnapshotter(account);
  }

  /**
   * Deauthorizes an account to take snapshots
   * @param account The account to de-authorize
   */
  function deauthorizeSnapshotter(address account) external onlyOwner {
    require(authorizedToSnapshot[account], "zDAOToken: Account not authorized");

    authorizedToSnapshot[account] = false;
    emit DeauthorizedSnapshotter(account);
  }

  /**
   * Withdraws ERC20 tokens that are stuck in this contract.
   * @param token The ERC20 token contract address to withdraw
   * @param to The address to send the tokens to
   * @param amount The amount of tokens to withdraw (0 means withdraw all available)
   */
  function withdrawERC20(
    IERC20 token,
    address to,
    uint256 amount
  ) external onlyOwner {
    require(
      address(token) != address(0),
      "zDAOToken: Token address cannot be zero"
    );
    require(
      address(token) != address(this),
      "zDAOToken: Token address cannot be this token"
    );
    require(to != address(0), "zDAOToken: Recipient address cannot be zero");

    uint256 withdrawAmount;
    if (amount == 0) {
      // If amount is 0, withdraw all available tokens
      withdrawAmount = token.balanceOf(address(this));
    } else {
      // Otherwise, ensure the requested amount doesn't exceed the contract's balance
      withdrawAmount = amount;
    }

    token.safeTransfer(to, withdrawAmount);

    emit ERC20TokenWithdrawn(token, to, withdrawAmount);
  }

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

    require(!paused(), "ERC20Pausable: token transfer while paused");

    _balances[sender] -= total;
    _updateAccountSnapshot(sender);

    for (uint256 i = 0; i < recipients.length; ++i) {
      address recipient = recipients[i];
      require(recipient != address(0), "ERC20: transfer to the zero address");

      // Note: _beforeTokenTransfer isn't called here
      // This function emulates what it would do (paused and snapshot)

      _balances[recipient] += amount;

      _updateAccountSnapshot(recipient);

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
    require(!paused(), "ERC20Pausable: token transfer while paused");

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
    _updateAccountSnapshot(sender);

    for (uint256 i = 0; i < recipients.length; ++i) {
      address recipient = recipients[i];
      require(recipient != address(0), "ERC20: transfer to the zero address");

      // Note: _beforeTokenTransfer isn't called here
      // This function emulates what it would do (paused and snapshot)

      _balances[recipient] += amount;

      _updateAccountSnapshot(recipient);

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
      _burn(from, amount);
    }
  }
}
