import { ethers, upgrades } from "hardhat";

const main = async () => {
  const proxy = "0xC33f704415384d63765e9200cbCfCcF3536fE137";

  const vestingV2 = await ethers.getContractFactory("MerkleTokenVestingV2");

  const c = await upgrades.upgradeProxy(proxy, vestingV2);
  console.log(c.address);
};

main();
