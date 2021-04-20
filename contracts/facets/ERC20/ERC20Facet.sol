// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import {Counters} from "@openzeppelin/contracts/utils/Counters.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";

import {LibDiamond} from "../../libraries/LibDiamond.sol";

import {IERC20Facet} from "../../interfaces/IERC20Facet.sol";

import {LibPausable} from "../shared/pausable/LibPausable.sol";
import {CallProtection} from "../shared/security/CallProtection.sol";

import {LibERC20Storage} from "./LibERC20Storage.sol";
import {LibERC20} from "./LibERC20.sol";

contract ERC20Facet is IERC20, IERC20Facet, CallProtection {
  using Counters for Counters.Counter;

  function initialize(
    uint256 initialSupply,
    string memory _name,
    string memory _symbol
  ) external override {
    LibDiamond.DiamondStorage storage ds = LibDiamond.diamondStorage();
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    require(
      bytes(es.name).length == 0 && bytes(es.symbol).length == 0,
      "ALREADY_INITIALIZED"
    );

    require(
      bytes(_name).length != 0 && bytes(_symbol).length != 0,
      "INVALID_PARAMS"
    );

    require(msg.sender == ds.contractOwner, "Must own the contract.");

    LibERC20.mint(msg.sender, initialSupply);

    es.name = _name;
    es.symbol = _symbol;
  }

  function name() external view override returns (string memory) {
    return LibERC20Storage.erc20Storage().name;
  }

  function setName(string calldata _name) external override protectedCall {
    LibERC20Storage.erc20Storage().name = _name;
  }

  function symbol() external view override returns (string memory) {
    return LibERC20Storage.erc20Storage().symbol;
  }

  function setSymbol(string calldata _symbol) external override protectedCall {
    LibERC20Storage.erc20Storage().symbol = _symbol;
  }

  function decimals() external pure override returns (uint8) {
    return 18;
  }

  function mint(address receiver, uint256 amount)
    external
    override
    protectedCall
  {
    _beforeTokenTransfer(address(0), receiver, amount);
    LibERC20.mint(receiver, amount);
  }

  function burn(address from, uint256 amount) external override protectedCall {
    _beforeTokenTransfer(from, address(0), amount);
    LibERC20.burn(from, amount);
  }

  function approve(address spender, uint256 amount)
    external
    override
    returns (bool)
  {
    require(spender != address(0), "SPENDER_INVALID");
    LibERC20Storage.erc20Storage().allowances[msg.sender][spender] = amount;
    emit Approval(msg.sender, spender, amount);
    return true;
  }

  function increaseApproval(address spender, uint256 amount)
    external
    override
    returns (bool)
  {
    require(spender != address(0), "SPENDER_INVALID");
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();
    es.allowances[msg.sender][spender] =
      es.allowances[msg.sender][spender] +
      amount;
    emit Approval(msg.sender, spender, es.allowances[msg.sender][spender]);
    return true;
  }

  function decreaseApproval(address spender, uint256 amount)
    external
    override
    returns (bool)
  {
    require(spender != address(0), "SPENDER_INVALID");
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();
    uint256 oldValue = es.allowances[msg.sender][spender];
    if (amount > oldValue) {
      es.allowances[msg.sender][spender] = 0;
    } else {
      es.allowances[msg.sender][spender] = oldValue - amount;
    }
    emit Approval(msg.sender, spender, es.allowances[msg.sender][spender]);
    return true;
  }

  function transfer(address to, uint256 amount)
    external
    override
    returns (bool)
  {
    _transfer(msg.sender, to, amount);
    return true;
  }

  function transferFrom(
    address from,
    address to,
    uint256 amount
  ) external override returns (bool) {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();
    require(from != address(0), "FROM_INVALID");

    // Update approval if not set to max uint256
    if (es.allowances[from][msg.sender] != type(uint256).max) {
      uint256 newApproval = es.allowances[from][msg.sender] - amount;
      es.allowances[from][msg.sender] = newApproval;
      emit Approval(from, msg.sender, newApproval);
    }

    _transfer(from, to, amount);
    return true;
  }

  function allowance(address owner, address spender)
    external
    view
    override
    returns (uint256)
  {
    return LibERC20Storage.erc20Storage().allowances[owner][spender];
  }

  function balanceOf(address account) external view override returns (uint256) {
    return LibERC20Storage.erc20Storage().balances[account];
  }

  function totalSupply() external view override returns (uint256) {
    return LibERC20Storage.erc20Storage().totalSupply;
  }

  /**
   * @dev Retrieves the balance of `account` at the time `snapshotId` was created.
   */
  function balanceOfAt(address account, uint256 snapshotId)
    external
    view
    returns (uint256)
  {
    return LibERC20.balanceOfAt(account, snapshotId);
  }

  /**
   * @dev Retrieves the total supply at the time `snapshotId` was created.
   */
  function totalSupplyAt(uint256 snapshotId) external view returns (uint256) {
    return LibERC20.totalSupplyAt(snapshotId);
  }

  function _beforeTokenTransfer(
    address from,
    address to,
    uint256 amount
  ) internal {
    require(!LibPausable.paused(), "IS_PAUSED");
    require(amount > 0, "ZERO_AMOUNT");

    if (from == address(0)) {
      // mint
      _updateAccountSnapshot(to);
      _updateTotalSupplySnapshot();
    } else if (to == address(0)) {
      // burn
      _updateAccountSnapshot(from);
      _updateTotalSupplySnapshot();
    } else {
      // transfer
      _updateAccountSnapshot(from);
      _updateAccountSnapshot(to);
    }
  }

  function _transfer(
    address from,
    address to,
    uint256 amount
  ) internal {
    require(to != address(0), "TO_INVALID");
    _beforeTokenTransfer(from, to, amount);

    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    es.balances[from] = es.balances[from] - amount;
    es.balances[to] = es.balances[to] - amount;

    emit Transfer(from, to, amount);
  }

  function _updateAccountSnapshot(address account) private {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    _updateSnapshot(es.accountBalanceSnapshots[account], es.balances[account]);
  }

  function _updateTotalSupplySnapshot() private {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    _updateSnapshot(es.totalSupplySnapshots, es.totalSupply);
  }

  function _updateSnapshot(
    LibERC20Storage.Snapshots storage snapshots,
    uint256 currentValue
  ) private {
    LibERC20Storage.ERC20Storage storage es = LibERC20Storage.erc20Storage();

    uint256 currentId = es.currentSnapshotId.current();
    if (_lastSnapshotId(snapshots.ids) < currentId) {
      snapshots.ids.push(currentId);
      snapshots.values.push(currentValue);
    }
  }

  function _lastSnapshotId(uint256[] storage ids)
    private
    view
    returns (uint256)
  {
    if (ids.length == 0) {
      return 0;
    } else {
      return ids[ids.length - 1];
    }
  }
}
