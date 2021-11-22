import { ethers, upgrades } from "hardhat";

const main = async () => {
  const proxy = "0xa37823d8BF0b2f8fddaE7b3357581e6a25Eb20A9";

  const vestingV2 = await ethers.getContractFactory("MerkleTokenVestingV2");
  const v2address = await upgrades.prepareUpgrade(proxy, vestingV2);
  console.log(v2address); //0x2B680AF189a1Afc68C5Ce5451010766Cc5c895Fb

  const c = await upgrades.upgradeProxy(proxy, vestingV2);
  console.log(c.address);
}

main();