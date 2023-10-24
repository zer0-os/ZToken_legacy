import * as hre from "hardhat";
import { ZeroToken } from "../typechain";
import { getLogger } from "../utilities";

const logger = getLogger("scripts::deployZERO");

// For validating the upgrade of ZERO we must first deploy ZERO to a testnet
// and perform some transactions
export async function deployZero() {
  await hre.run("compile");

  const amount = hre.ethers.utils.parseEther("10101010101");

  logger.log("Deploying ZERO ERC20 token");

  logger.log(`Deploying to ${hre.network.name}`);

  logger.log(
    `Will mint ${amount.toString()} tokens`
  );

  const [deployer] = await hre.ethers.getSigners();

  logger.log(
    `'${deployer.address}' will be used as the deployment account`
  );
  const factory = await hre.ethers.getContractFactory("ZeroToken", deployer);

  const contract = await hre.upgrades.deployProxy(
    factory,
    [
      "Zero",
      "ZERO",
    ],
    {
      initializer: "initialize"
    }) as ZeroToken;

  await contract.deployed();

  logger.log(`Deployed contract at address: ${contract.address}`);
  const implAddr = await hre.upgrades.erc1967.getImplementationAddress(contract.address);
  logger.log(`With implementation contract address at: ${implAddr}`);

  logger.log(`Minting ${amount.toString()} tokens for deployer`);

  const tx = await contract.connect(deployer).mint(deployer.address, amount.toString());

  await tx.wait();

  logger.log(`Balance of deployer is now ${await contract.balanceOf(deployer.address)}`);

  return contract;
}

const tryDeployZero = async () => {
  await deployZero()
}

tryDeployZero();
