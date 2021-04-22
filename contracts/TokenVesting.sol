// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

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

  uint256 public vestingStart;
  uint256 public vestingCliff;
  uint256 public vestingDuration;

  mapping(address => mapping(address => uint256)) public awardedAmount;
  mapping(address => mapping(address => bool)) public awardRevocable;

  mapping(address => mapping(address => uint256)) public releasedTokens;
  mapping(address => mapping(address => bool)) public awardRevoked;

  /**
   * @dev Creates a vesting contract that vests its balance of any ERC20 token to beneficiaries gradually in a linear fashion until _start + _duration. By then all
   * of the balance will have vested.
   * @param start start block to begin vesting
   * @param cliff cliff to start vesting on, set to zero if immediately after start
   * @param duration duration in blocks to vest over
   */
  function initialize(
    uint256 start,
    uint256 cliff,
    uint256 duration
  ) public initializer {
    __Ownable_init();

    require(cliff <= duration);

    vestingStart = start;
    vestingCliff = start + cliff;
    vestingDuration = duration;
  }

  /**
   * @dev Awards tokens to a beneficiary.
   * *** The tokens to be awarded must be separately transfered to this contract. ***
   * @param beneficiary the address to award to
   * @param token address of the token to award
   * @param amount amount of tokens to award
   * @param revocable whether this award can be revoced at a later time
   */
  function awardTokens(
    address beneficiary,
    IERC20 token,
    uint256 amount,
    bool revocable
  ) public onlyOwner {
    require(
      awardedAmount[beneficiary][address(token)] == 0,
      "Cannot award twice"
    );

    awardedAmount[beneficiary][address(token)] = amount;
    awardRevocable[beneficiary][address(token)] = revocable;

    emit Awarded(beneficiary, address(token), amount, revocable);
  }

  /**
   * @notice Transfers vested tokens to beneficiary.
   * @param beneficiary Who the tokens are being released to
   * @param token ERC20 token which is being vested
   */
  function release(address beneficiary, IERC20 token) public {
    uint256 unreleased = getReleasableAmount(beneficiary, token);

    require(unreleased > 0, "Nothing to release");

    releasedTokens[beneficiary][address(token)] += unreleased;

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
    require(awardRevocable[beneficiary][address(token)], "Cannot be revoked");
    require(!awardRevoked[beneficiary][address(token)], "Already revoked");

    // Mark as revoked
    awardRevoked[beneficiary][address(token)] = true;

    // Figure out how many tokens were owed up until revocation
    uint256 unreleased = getReleasableAmount(beneficiary, token);
    releasedTokens[beneficiary][address(token)] += unreleased;

    uint256 refund =
      awardedAmount[beneficiary][address(token)] -
        releasedTokens[beneficiary][address(token)];

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
    if (awardRevoked[beneficiary][address(token)]) {
      return 0;
    }

    return
      getVestedAmount(beneficiary, token) -
      releasedTokens[beneficiary][address(token)];
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

    if (
      block.number < vestingCliff || awardRevoked[beneficiary][address(token)]
    ) {
      return 0;
    } else if (block.number >= vestingStart + vestingDuration) {
      return totalAwarded;
    } else {
      return (totalAwarded * (block.number - vestingStart)) / vestingDuration;
    }
  }
}
