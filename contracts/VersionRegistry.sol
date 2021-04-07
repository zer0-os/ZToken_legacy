// SPDX-License-Identifier: MIT
pragma solidity ^0.8.3;

import "./interfaces/IVersionRegistry.sol";
import "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";

contract VersionRegistry is IVersionRegistry, OwnableUpgradeable {
  event NewWeb3API(uint256 indexed apiId, string name);
  event NewVersion(
    uint256 indexed apiId,
    uint256 versionId,
    uint256 major,
    uint256 minor,
    uint256 patch,
    string location
  );

  struct Web3APIVersion {
    bool leaf;
    uint256 latestVersion;
    bool created;
  }

  mapping(uint256 => Web3APIVersion) public nodes;

  function initialize() public initializer {
    __Ownable_init();
  }

  function registerNewWeb3API(string memory name) public {
    uint256 id = uint256(keccak256(bytes(name)));
    emit NewWeb3API(id, name);
  }

  function pushNewVersion(
    uint256 apiId,
    uint256 major,
    uint256 minor,
    string memory location
  ) public {
    uint256 apiNodeId = uint256(keccak256(abi.encodePacked(apiId)));
    Web3APIVersion storage latestNode = nodes[apiNodeId];

    if (latestNode.latestVersion < major) {
      latestNode.latestVersion = major;
    }
    latestNode.created = true;

    uint256 majorNodeId =
      uint256(keccak256(abi.encodePacked(apiNodeId, major)));
    Web3APIVersion storage majorNode = nodes[majorNodeId];
    if (majorNode.latestVersion < minor) {
      majorNode.latestVersion = minor;
    }
    majorNode.created = true;

    uint256 minorNodeId =
      uint256(keccak256(abi.encodePacked(majorNodeId, minor)));
    Web3APIVersion storage minorNode = nodes[minorNodeId];
    uint256 latestPatchVersion = 0;
    if (minorNode.created) {
      latestPatchVersion = ++minorNode.latestVersion;
    } else {
      minorNode.created = true;
    }

    uint256 patchNodeId =
      uint256(keccak256(abi.encodePacked(minorNodeId, latestPatchVersion)));
    Web3APIVersion storage patchNode = nodes[patchNodeId];
    patchNode.leaf = true;
    patchNode.created = true;

    emit NewVersion(
      apiId,
      patchNodeId,
      major,
      minor,
      latestPatchVersion,
      location
    );
  }

  function resolveToLeaf(uint256 nodeId) public view returns (uint256) {
    Web3APIVersion storage node = nodes[nodeId];
    require(node.created, "Invalid Node");

    if (node.leaf) {
      return nodeId;
    }

    uint256 latestNodeId =
      uint256(keccak256(abi.encodePacked(nodeId, node.latestVersion)));

    uint256 leafNodeId = resolveToLeaf(latestNodeId);

    return leafNodeId;
  }
}
