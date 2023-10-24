import * as hre from "hardhat";
import { MeowToken, ZeroToken } from "../typechain";
import { getLogger } from "../utilities";
import assert from "assert";


const logger = getLogger("scripts::deployZERO");

// Sepolia
const zeroTokenAddress = "0x1A9A8894bc8611a39c7Ed690AED71b7918995F14";

// Test accounts that have existing balances
const testAccounts = [
  "0xaE3153c9F5883FD2E78031ca2716520748c521dB",
  "0xa74b2de2D65809C613010B3C8Dc653379a63C55b",
  "0x0f3b88095e750bdD54A25B2109c7b166A34B6dDb"
];

export async function upgradeToken(tokenAddress ?: string) {
  await hre.run("compile");

  logger.log("Upgrading ZERO token to MEOW");

  logger.log(`Upgrading on ${hre.network.name}`);

  const [deployer] = await hre.ethers.getSigners();

  logger.log(
    `'${deployer.address}' will be used as the deployment account`
  );

  const zeroTokenFactory = await hre.ethers.getContractFactory("ZeroToken", deployer);

  const zeroAddress = tokenAddress ? tokenAddress : zeroTokenAddress;

  const token = zeroTokenFactory.attach(zeroAddress) as ZeroToken;

  logger.log(`Preupgrade checking balances of test accounts`);
  for (const user of testAccounts) {
    const balance = await token.balanceOf(user);
    logger.log(`Balance of ${user} is ${balance.toString()}`);
  }

  const meowTokenFactory = await hre.ethers.getContractFactory("MeowToken", deployer);

  const contract = await hre.upgrades.upgradeProxy(
    zeroAddress,
    meowTokenFactory
  ) as MeowToken;

  await contract.deployed();

  logger.log(`Upgraded contract at address: ${zeroAddress}`);
  const implAddr = await hre.upgrades.erc1967.getImplementationAddress(zeroAddress);
  logger.log(`With implementation contract address at: ${implAddr}`);

  // compare this object and the contract object above
  // can use node default assert
  // make this one big connected thing with deploy and upgrade together
  // skip deployment if mainnet, go straight to upgrade
  // last step of renounceOwnership doesn't need code, just propose in defender
  // make sure we also check approvals
  // also verify burn mechanism
  // "approval, transfers, burn"
  // deploy the implementation, then the verify it and then upgrade is through defender
  // one for deploy, one for deploy impl, the run upgrade (doesn't get added on mainnet)
  const meowtoken = meowTokenFactory.attach(zeroAddress);

  assert.equal(contract.address, zeroAddress, "Addresses should be equal");

  logger.log(`Postupgrade checking balances of test accounts`);
  for (const user of testAccounts) {
    const balance = await meowtoken.balanceOf(user);
    logger.log(`Balance of ${user} is ${balance.toString()}`);
  }

  return contract;
}

const tryUpgradeToken = async () => {
  await upgradeToken();
}

tryUpgradeToken();
