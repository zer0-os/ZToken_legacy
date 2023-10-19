import * as hre from "hardhat";
import { MeowToken, ZeroToken } from "../typechain";
import { getLogger } from "../utilities";
import { impersonate } from "../test/helpers";
import { assert } from "console";

const logger = getLogger("scripts::deployZERO");

// Sepolia
const tokenProxyAddress = "0x1A9A8894bc8611a39c7Ed690AED71b7918995F14";
// Will be the same proxy with different impl
const meowTokenImplAddress = ""

// Test accounts that have existing balances
const testAccounts = [
  "0xaE3153c9F5883FD2E78031ca2716520748c521dB",
  "0xa74b2de2D65809C613010B3C8Dc653379a63C55b",
  "0x0f3b88095e750bdD54A25B2109c7b166A34B6dDb"
];

async function main() {
  logger.log(`Confirm transfer, transferBulk, transferFromBulk, and allowances`);

  const userA = await impersonate(testAccounts[0]);
  const userB = await impersonate(testAccounts[1]);
  const userC = await impersonate(testAccounts[2]);

  const [deployer] = await hre.ethers.getSigners();

  // Transfer to contract and verify there is a burn of the same amount
  const meowTokenFactory = await hre.ethers.getContractFactory("MeowToken", deployer);

  // This will be the same address
  const meowToken = meowTokenFactory.attach(tokenProxyAddress) as MeowToken;

  const totalSupplyBefore = await meowToken.totalSupply();

  const amount = await hre.ethers.utils.parseEther("1");
  await meowToken.connect(deployer).transfer(tokenProxyAddress, amount);

  const totalSupplyAfter = await meowToken.totalSupply();

  assert(totalSupplyBefore.sub(totalSupplyAfter).eq(amount), `Total supply should be burned by ${amount.toString()}`);

  const balanceA = await meowToken.balanceOf(userA.address);
  const balanceB = await meowToken.balanceOf(userB.address);
  const balanceC = await meowToken.balanceOf(userC.address);

  await meowToken.connect(deployer).transferBulk(testAccounts, amount)

}

const tryMain = async () => {
  await main()
}

tryMain();
