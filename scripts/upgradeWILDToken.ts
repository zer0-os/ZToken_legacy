import { ethers, defender } from "hardhat";

const main = async () => {
  const proxy = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";

  const tokenContractFactory = await ethers.getContractFactory("ZeroToken");

  const c = await defender.proposeUpgrade(proxy, tokenContractFactory);
  console.log(c);
};

main();
