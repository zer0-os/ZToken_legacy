import * as hre from "hardhat";

import {
  ZeroDAOTokenV2,
  ERC20Mock__factory,
  ZeroDAOToken__factory,
  ZeroDAOTokenV2__factory
} from "../../typechain";

import { getLogger } from "../../utilities";

const logger = getLogger("test-upgrade::balance::transfer");

const main = async () => {
  const [deployer] = await hre.ethers.getSigners();

  // do actual like we actually do it, deploy impl, then write to file

  // Using mainnet
  const wildAddress = process.env.WILD_ADDRESS;
  if (!wildAddress) throw Error("No WILD token contract address given");

  const mockAddress = process.env.MOCK_ADDRESS ?? "";
  if (!mockAddress) throw Error("No MOCK token contract address given");

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