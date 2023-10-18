// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./ERC20UpgradeableOld.sol";
import "@openzeppelin/contracts-upgradeable-400/access/OwnableUpgradeable.sol";


// To show that the OZ validation fails appropriately we create a fake contract
// that will intentionally have a different storage layout than ZERO's contract.
contract FailToken is OwnableUpgradeable, ERC20Upgradeable {
    function initialize(
        string memory name,
        string memory symbol
    ) public initializer {
        __Ownable_init();
        __ERC20_init(name, symbol);
    }

    // Not an upgrade safe change
    function destruct(address payable recipient) public {
        selfdestruct(recipient);
    }

    function _beforeTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override {
        super._beforeTokenTransfer(from, to, amount);
    }
}
