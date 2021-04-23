// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {TokenVesting, IERC20} from "./TokenVesting.sol";

contract MerkleTokenVesting is TokenVesting {
  event Claimed(uint256 index, address account, uint256 amount);

  bytes32 public merkleRoot;

  mapping(uint256 => uint256) private claimedBitMap;

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
    uint256 duration,
    address token,
    bytes32 _merkleRoot
  ) public initializer {
    __TokenVesting_init(start, cliff, duration, token);

    merkleRoot = _merkleRoot;
  }

  function claim(
    uint256 index,
    address account,
    uint256 amount,
    bool revocable,
    bytes32[] calldata merkleProof
  ) external override {
    require(!isClaimed(index), "MerkleTokenVesting: Award already claimed.");

    // Verify the merkle proof.
    bytes32 node =
      keccak256(abi.encodePacked(index, account, amount, revocable));
    require(
      MerkleProof.verify(merkleProof, merkleRoot, node),
      "MerkleTokenVesting: Invalid proof."
    );

    _setClaimed(index);

    awardTokens(account, amount, revocable);

    emit Claimed(index, account, amount);
  }

  /**
   * @dev Used to check if a token award has been claimed from the merkle tree.
   * @param index The index of the award
   */
  function isClaimed(uint256 index) public view returns (bool) {
    uint256 claimedWordIndex = index / 256;
    uint256 claimedBitIndex = index % 256;
    uint256 claimedWord = claimedBitMap[claimedWordIndex];
    uint256 mask = (1 << claimedBitIndex);
    return claimedWord & mask == mask;
  }

  /**
   * @dev Used to set that a token award has been claimed.
   * @param index The index of the award
   */
  function _setClaimed(uint256 index) private {
    uint256 claimedWordIndex = index / 256;
    uint256 claimedBitIndex = index % 256;
    claimedBitMap[claimedWordIndex] =
      claimedBitMap[claimedWordIndex] |
      (1 << claimedBitIndex);
  }
}
