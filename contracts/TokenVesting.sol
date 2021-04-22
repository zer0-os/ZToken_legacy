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

  event Awarded(
    address indexed beneficiary,
    address indexed token,
    uint256 amount,
    bool revocable
  );
  event Released(
    address indexed beneficiary,
    address indexed token,
    uint256 amount
  );
  event Revoked(
    address indexed beneficiary,
    address indexed token,
    uint256 amount
  );

  uint256 public cliff;
  uint256 public start;
  uint256 public duration;

  mapping(address => mapping(address => uint256)) public awardedAmount;
  mapping(address => mapping(address => bool)) public revocable;

  mapping(address => mapping(address => uint256)) public released;
  mapping(address => mapping(address => bool)) public revoked;

  /**
   * @dev Creates a vesting contract that vests its balance of any ERC20 token to beneficiaries gradually in a linear fashion until _start + _duration. By then all
   * of the balance will have vested.
   * @param _start start block to begin vesting
   * @param _cliff no tokens will vest before this block number (can be after start)
   * @param _duration duration in blocks to vest over
   */

  function initialize(
    uint256 _start,
    uint256 _cliff,
    uint256 _duration
  ) public initializer {
    __Ownable_init();

    require(_cliff <= _duration);

    duration = _duration;
    cliff = _start + _cliff;
    start = _start;
  }

  function awardTokens(
    address beneficiary,
    IERC20 token,
    uint256 amount,
    bool _revocable
  ) public onlyOwner {
    require(
      awardedAmount[beneficiary][address(token)] == 0,
      "Cannot award twice"
    );

    awardedAmount[beneficiary][address(token)] = amount;
    revocable[beneficiary][address(token)] = _revocable;

    emit Awarded(beneficiary, address(token), amount, _revocable);
  }

  /**
   * @notice Transfers vested tokens to beneficiary.
   * @param beneficiary Who the tokens are being released to
   * @param token ERC20 token which is being vested
   */
  function release(address beneficiary, IERC20 token) public {
    uint256 unreleased = getReleasableAmount(beneficiary, token);

    require(unreleased > 0, "Nothing to release");

    released[beneficiary][address(token)] += unreleased;

    token.safeTransfer(beneficiary, unreleased);

    emit Released(beneficiary, address(token), unreleased);
  }

  /**
   * @notice Allows the owner to revoke the vesting. Tokens already vested
   * are transfered to the beneficiary, the rest are returned to the owner.
   * @param beneficiary Who the tokens are being released to
   * @param token ERC20 token which is being vested
   */
  function revoke(address beneficiary, IERC20 token) public onlyOwner {
    require(revocable[beneficiary][address(token)], "Cannot be revoked");
    require(!revoked[beneficiary][address(token)], "Already revoked");

    // Mark as revoked
    revoked[beneficiary][address(token)] = true;

    // Figure out how many tokens were owed up until revocation
    uint256 unreleased = getReleasableAmount(beneficiary, token);
    released[beneficiary][address(token)] += unreleased;

    uint256 refund =
      awardedAmount[beneficiary][address(token)] -
        released[beneficiary][address(token)];

    // Transfer owed vested tokens to beneficiary
    token.safeTransfer(beneficiary, unreleased);
    // Transfer unvested tokens to owner (revoked amount)
    token.safeTransfer(owner(), refund);

    emit Released(beneficiary, address(token), unreleased);
    emit Revoked(beneficiary, address(token), refund);
  }

  /**
   * @dev Calculates the amount that has already vested but hasn't been released yet.
   * @param beneficiary Who the tokens are being released to
   * @param token ERC20 token which is being vested
   */
  function getReleasableAmount(address beneficiary, IERC20 token)
    public
    view
    returns (uint256)
  {
    if (revoked[beneficiary][address(token)]) {
      return 0;
    }

    return
      getVestedAmount(beneficiary, token) -
      released[beneficiary][address(token)];
  }

  /**
   * @dev Calculates the amount that has already vested.
   * @param beneficiary Who the tokens are being released to
   * @param token ERC20 token which is being vested
   */
  function getVestedAmount(address beneficiary, IERC20 token)
    public
    view
    returns (uint256)
  {
    uint256 totalAwarded = awardedAmount[beneficiary][address(token)];

    if (block.number < cliff || revoked[beneficiary][address(token)]) {
      return 0;
    } else if (block.number >= start + duration) {
      return totalAwarded;
    } else {
      return (totalAwarded * (block.number - start)) / duration;
    }
  }
}
