// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

/**
 * @title TokenVesting
 * @dev A token holder contract that can release its token balance gradually like a
 * typical vesting scheme, with a cliff and vesting period. Optionally revocable by the
 * owner.
 */
contract TokenVesting is OwnableUpgradeable {
  using SafeERC20 for IERC20;

  event Released(address beneficiary, address token, uint256 amount);
  event Revoked(address beneficiary, address token, uint256 amount);

  // beneficiary of tokens after they are released
  address public beneficiary;

  uint256 public cliff;
  uint256 public start;
  uint256 public duration;

  bool public revocable;

  mapping(address => uint256) public released;
  mapping(address => bool) public revoked;

  /**
   * @dev Creates a vesting contract that vests its balance of any ERC20 token to the
   * _beneficiary, gradually in a linear fashion until _start + _duration. By then all
   * of the balance will have vested.
   * @param _beneficiary address of the beneficiary to whom vested tokens are transferred
   * @param _cliff duration in seconds of the cliff in which tokens will begin to vest
   * @param _duration duration in seconds of the period in which the tokens will vest
   * @param _revocable whether the vesting is revocable or not
   */

  function initialize(
    address _beneficiary,
    uint256 _start,
    uint256 _cliff,
    uint256 _duration,
    bool _revocable
  ) public initializer {
    __Ownable_init();

    require(_beneficiary != address(0));
    require(_cliff <= _duration);

    beneficiary = _beneficiary;
    revocable = _revocable;
    duration = _duration;
    cliff = _start + _cliff;
    start = _start;
  }

  /**
   * @notice Transfers vested tokens to beneficiary.
   * @param token ERC20 token which is being vested
   */
  function release(IERC20 token) public {
    uint256 unreleased = releasableAmount(token);

    require(unreleased > 0, "Nothing to release");

    released[address(token)] += unreleased;

    token.safeTransfer(beneficiary, unreleased);

    emit Released(beneficiary, address(token), unreleased);
  }

  /**
   * @notice Allows the owner to revoke the vesting. Tokens already vested
   * remain in the contract, the rest are returned to the owner.
   * @param token ERC20 token which is being vested
   */
  function revoke(IERC20 token) public onlyOwner {
    require(revocable, "Cannot be revoked");
    require(!revoked[address(token)], "Already revoked");

    uint256 balance = token.balanceOf(address(this));

    uint256 unreleased = releasableAmount(token);
    uint256 refund = balance - unreleased;

    revoked[address(token)] = true;

    token.safeTransfer(owner(), refund);

    emit Revoked(beneficiary, address(token), refund);
  }

  /**
   * @dev Calculates the amount that has already vested but hasn't been released yet.
   * @param token ERC20 token which is being vested
   */
  function releasableAmount(IERC20 token) public view returns (uint256) {
    return vestedAmount(token) - released[address(token)];
  }

  /**
   * @dev Calculates the amount that has already vested.
   * @param token ERC20 token which is being vested
   */
  function vestedAmount(IERC20 token) public view returns (uint256) {
    uint256 currentBalance = token.balanceOf(address(this));
    uint256 totalBalance = currentBalance + released[address(token)];

    if (block.timestamp < cliff) {
      return 0;
    } else if (block.timestamp >= start + duration || revoked[address(token)]) {
      return totalBalance;
    } else {
      return (totalBalance * (block.timestamp - start)) / duration;
    }
  }
}
