import { ethers, upgrades } from "hardhat";

const main = async () => {
  const proxy = "0x424D286589b7339867Bb96E7984e2264F2D041bC";

  const vestingV2 = await ethers.getContractFactory("MerkleTokenVestingV2");

  const c = await upgrades.upgradeProxy(proxy, vestingV2);
  console.log(c.address);
};

main();
