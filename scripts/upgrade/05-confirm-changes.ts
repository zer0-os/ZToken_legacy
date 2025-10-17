import { ZeroDAOToken__factory } from "../../typechain";
import * as hre from "hardhat";
import * as fs from "fs";

const main = async () => {
  const [deployer] = await hre.ethers.getSigners();

  const tokenAddress = process.env.TOKEN_ADDRESS;

  if (!tokenAddress) throw Error("No token address given");

  const factory = new ZeroDAOToken__factory(deployer);

  const mintData = factory.interface.encodeFunctionData("mint", [
    deployer.address,
    hre.ethers.utils.parseEther("1"),
  ]);

  const burnData = factory.interface.encodeFunctionData("burn", [
    deployer.address,
    hre.ethers.utils.parseEther("1"),
  ]);

  // Confirm the public `mint` is no longer on the contract by trying to call it and logging the failure
  try {
    const tx = await deployer.sendTransaction({
      to: tokenAddress,
      data: mintData,
      value: 0,
      gasLimit: 500000,
    });

    await tx.wait(3);
  } catch (e) {
    const outputObj = {
      message: (e as Error).message,
    };
    fs.writeFileSync(
      "05-mint-error.json",
      JSON.stringify(outputObj, undefined, 2)
    );
  }

  // Confirm the public `burn` is no longer on the contract by trying to call it and logging the failure
  try {
    const tx = await deployer.sendTransaction({
      to: tokenAddress,
      data: burnData,
      value: 0,
    });

    await tx.wait(3);
  } catch (e) {
    const outputObj = {
      message: (e as Error).message,
    };
    fs.writeFileSync(
      "05-burn-error.json",
      JSON.stringify(outputObj, undefined, 2)
    );
  }
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    throw error;
  });
