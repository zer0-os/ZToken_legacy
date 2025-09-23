import * as hre from "hardhat";
import * as fs from "fs";
import assert from "assert";
import {
  ERC20Mock__factory,
  ZeroDAOToken__factory,
  ZeroDAOToken
} from "../../typechain";
import { deployAndTransferOwner } from "../../test/helpers/deploy-and-transfer";
import { getLogger } from "../../utilities";

const logger = getLogger("deploy-v1");

/**
 * Perform a deployment of a ZeroDAOToken as well as an ERC20Mock token
 */
const main = async () => {
  const [deployer] = await hre.ethers.getSigners();

  const name = "Wilder World Test";
  const symbol = "tWILD";

  // The address of the owner to be transferred to.
  // If not using hardhat, this should be a Safe address
  let newOwnerAddress = process.env.OWNER_ADDRESS;

  if (!newOwnerAddress) {
    if (hre.network.name !== "hardhat") {
      throw new Error("No address given for transfer ownership call");
    } else {
      // Hardhat, can just use the same address in testing script
      newOwnerAddress = deployer.address;
    }
  }

  logger.info(`Network: ${hre.network.name}`);
  logger.info(`Deploying token: ${name} with symbol ${symbol}`);
  logger.info(`Deployer: ${deployer.address}`);
  logger.info(`New owner will be: ${newOwnerAddress}`);

  // Deploy ZeroDaoTokenV1 and transfer ownership
  const zeroDAOTokenV1 = await deployAndTransferOwner<ZeroDAOToken>(
    new ZeroDAOToken__factory(deployer),
    [
      name,
      symbol
    ],
    newOwnerAddress
  );

  logger.info(`${name} token deployed to address: ${zeroDAOTokenV1.address}`);
  logger.info(`Ownership transferred to: ${newOwnerAddress}`);

  // Deploy a mock token to later transfer balance to the zeroDAOToken
  const mockName = "Mock Token";
  const mockSymbol = "MOCK";
  logger.info(`Deploying token: ${mockName} with symbol ${mockSymbol}`);

  const mockTokenFactory = new ERC20Mock__factory(deployer);
  const mockToken = await mockTokenFactory.deploy(mockName, mockSymbol);

  if (hre.network.name !== "hardhat") {
    await mockToken.deployed();
  }

  logger.info(`${mockName} deployed to address: ${mockToken.address}`);

  const amount = hre.ethers.utils.parseUnits("500000", 6);
  logger.info(`Minting ${amount.toString()} of ${mockSymbol} to ${zeroDAOTokenV1.address}`);

  const balanceBefore = await mockToken.balanceOf(zeroDAOTokenV1.address);
  logger.info(`Balance before minting: ${balanceBefore.toString()}`);

  const tx = await mockToken.mint(zeroDAOTokenV1.address, amount);
  await tx.wait(hre.network.name === "hardhat" ? 0 : 3);

  const balanceAfter = await mockToken.balanceOf(zeroDAOTokenV1.address);
  logger.info(`Balance after minting: ${balanceAfter.toString()}`);

  // Confirm balance has changed correctly
  assert(balanceAfter.eq(balanceBefore.add(amount)), "Balance minting failed");

  logger.info(`Minting successful: ${amount.toString()} of ${mockSymbol} to ${zeroDAOTokenV1.address}`);

  const obj = {
    network: hre.network.name,
    zeroDAOToken: zeroDAOTokenV1.address,
    zeroDAOTokenOwner: newOwnerAddress,
    mockToken: mockToken.address,
    mockTokenAmount: amount.toString(),
    deployedAt: new Date().toISOString()
  };

  // Write to file with predictable naming
  const outputFile = `01-deploy-v1-${hre.network.name}-${Date.now()}.json`;
  fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
  logger.info(`Deployment data saved to: ${outputFile}`);

  logger.info("=== Deployment Summary ===");
  logger.info(`Network: ${obj.network}`);
  logger.info(`ZeroDAOToken: ${obj.zeroDAOToken}`);
  logger.info(`ZeroDAOToken Owner: ${obj.zeroDAOTokenOwner}`);
  logger.info(`MockToken: ${obj.mockToken}`);
  logger.info(`MockToken Amount Minted: ${obj.mockTokenAmount}`);
};

main()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    logger.error("Deployment failed:", error);
    process.exit(1);
  });
