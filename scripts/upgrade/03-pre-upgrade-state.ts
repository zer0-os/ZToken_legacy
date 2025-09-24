import * as hre from "hardhat";
import { readContractStorage } from "../utils/storage-check";
import { ZeroDAOToken, ZeroDAOToken__factory } from "../../typechain";

import * as fs from "fs";

const main = async () => {
  const [deployer] = await hre.ethers.getSigners();

  const tokenAddress = process.env.TOKEN_ADDRESS;
  if (!tokenAddress) throw Error("No token address present in env");

  const tokenFactory = new ZeroDAOToken__factory(deployer);
  const token = tokenFactory.attach(tokenAddress);

  const state = await readContractStorage(
    tokenFactory,
    token
  );

  fs.writeFileSync(`03-pre-upgrade-state-${hre.network.name}-${Date.now()}.json`, JSON.stringify(state, undefined, 2));
}

main();