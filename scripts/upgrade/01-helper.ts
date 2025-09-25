import * as hre from "hardhat";
import *  as fs from "fs";
import { assert } from "console";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { getLogger } from "../../utilities";
import { deployAndTransferOwner } from "../../test/helpers/deploy-and-transfer";
import { ZeroDAOToken, ZeroDAOToken__factory, ERC20Mock__factory } from "../../typechain";

export const deployV1 = async (
  creator: SignerWithAddress,
  outputFile?: string
): Promise<ZeroDAOToken> => {
  const logger = getLogger("deploy-v1");

  const name = "Wilder World Test";
  const symbol = "tWILD";

  // The address of the new owner to be transferred to for WILD as well as ProxyAdmin
  // If not using hardhat, this should be a Safe address
  let newOwnerAddress = process.env.OWNER_ADDRESS; // TODO script instead, make param

  if (!newOwnerAddress) {
    if (hre.network.name !== "hardhat") {
      throw new Error("No address given for transfer ownership call");
    } else {
      // Hardhat, can just use the same address in testing script
      newOwnerAddress = creator.address;
    }
  }

  logger.info(`Network: ${hre.network.name}`);
  logger.info(`Deploying token: ${name} with symbol ${symbol}`);
  logger.info(`Deployer: ${creator.address}`);
  logger.info(`New owner will be: ${newOwnerAddress}`);

  // Deploy ZeroDaoTokenV1 and transfer ownership
  const factory = new ZeroDAOToken__factory(creator);
  const zeroDAOTokenV1 = await hre.upgrades.deployProxy(
    factory,
    [
      name,
      symbol
    ],
  ) as ZeroDAOToken;

  if (hre.network.name !== "hardhat") {
    await zeroDAOTokenV1.deployed();
  }

  logger.info("Transferring ownership of proxy...");
  // Transfer ownership of contract itself
  await zeroDAOTokenV1["transferOwnership(address)"](newOwnerAddress);

  // Transfer ownership or proxy admin, if needed
  const proxyAdmin = await hre.upgrades.admin.getInstance();
  const owner = await proxyAdmin.owner();
  logger.info(`Current Proxy Admin owner: ${owner}`);

  if (owner !== newOwnerAddress && owner === creator.address) {
    logger.info(`Transferring Proxy Admin Ownership to ${newOwnerAddress}`);
    await proxyAdmin.transferOwnership(newOwnerAddress);
  }

  logger.info(`${name} token deployed to address: ${zeroDAOTokenV1.address}`);
  logger.info(`Ownership transferred successfully`);

  // Deploy a mock token to later transfer balance to the zeroDAOToken
  const mockName = "Mock Token";
  const mockSymbol = "MOCK";
  logger.info(`Deploying token: ${mockName} with symbol ${mockSymbol}`);

  const mockTokenFactory = new ERC20Mock__factory(creator);
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

  // Write to file if path specified
  if (outputFile) {
    const proxyAdmin = await hre.upgrades.admin.getInstance();
    const obj = {
      network: hre.network.name,
      timestamp: Date.now(),
      zeroDAOToken: zeroDAOTokenV1.address,
      zeroDAOTokenOwner: newOwnerAddress,
      proxyAdmin: proxyAdmin.address,
      proxyAdminOwner: await proxyAdmin.owner(), // Should be the same as newOwnerAddress
      mockToken: mockToken.address,
      mockTokenAmount: amount.toString(),
      deployedAt: new Date().toISOString()
    };

    fs.writeFileSync(outputFile, JSON.stringify(obj, undefined, 2));
    logger.info(`Deployment data saved to: ${outputFile}`);
  }

  return zeroDAOTokenV1;
}