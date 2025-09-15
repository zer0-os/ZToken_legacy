import * as hre from "hardhat";

import {
  ERC20Mock,
  ZeroDAOToken,
  ZeroDAOTokenV2,
  ERC20Mock__factory,
  ZeroDAOToken__factory,
  ZeroDAOTokenV2__factory
} from "../typechain";

import { getLogger } from "../utilities";

const logger = getLogger("test-upgrade::balance::transfer");

const main = async () => {
  const [deployer] = await hre.ethers.getSigners();

  // Sepolia address
  const wildAddress = "0xce32eB5782e7B30F05144cF0eC542AC28226D63D";
  const mockAddress = "0xebaA3D9F2f21f7aA9c45fae035C0eeF1558cB81E";

  const wildToken = new ZeroDAOToken__factory(deployer).attach(wildAddress);
  const mockToken = new ERC20Mock__factory(deployer).attach(mockAddress);

  logger.info(`1. Give balance of "mockToken" to "wildToken" contract`);
  logger.info("Balance Before Mint: ", await mockToken.balanceOf(wildAddress));

  // Minting to a contract works 
  const mintTx = await mockToken.connect(deployer)["mint(address,uint256)"](wildAddress, hre.ethers.utils.parseUnits("500000", 6))

  await mintTx.wait(3);

  logger.info("Balance After Mint: ", await mockToken.balanceOf(wildAddress));

  logger.info(`2. Upgrade "wildToken" from ZeroDAOToken to ZeroDAOTokenV2`);

  const newWildToken = await hre.upgrades.upgradeProxy(
    wildAddress,
    new ZeroDAOTokenV2__factory(deployer),
  ) as ZeroDAOTokenV2;

  logger.info("Successfully upgraded...");

  logger.info("3. Confirm balance is unchanged");

  const balance = await mockToken.balanceOf(wildAddress);

  logger.info("Balance of wildToken before: ", await mockToken.balanceOf(wildAddress));
  logger.info("Balance of deployer before: ", await mockToken.balanceOf(deployer.address));

  logger.info("4. Withdraw balance");

  const withdrawTx = await newWildToken.withdrawERC20(
    mockAddress,
    deployer.address,
    balance
  );

  const receipt = await withdrawTx.wait(3);

  logger.info("withdrawTx Hash: ", receipt.transactionHash);

  // wildToken should have no balance after
  // Deployer should have entire `mockToken` balance after
  logger.info("Balance of wildToken after: ", await mockToken.balanceOf(wildAddress));
  logger.info("Balance of deployer after: ", await mockToken.balanceOf(deployer.address));
}

main();