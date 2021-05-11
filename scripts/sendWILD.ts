import { BigNumber } from "@ethersproject/bignumber";
import * as hre from "hardhat";
import { doDeployToken } from "../tasks/deploy";
import { ZeroDAOToken, ZeroDAOToken__factory } from "../typechain";
import { getLogger } from "../utilities";

import * as fs from "fs";
import { ethers } from "hardhat";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import { Signer } from "ethers";

const logger = getLogger("scripts::sendWILD");

const numDecimals = 18;
const decimals = BigNumber.from(10).pow(numDecimals); // token has 18 decimal places

const tokenAddress = "0x2a3bFF78B79A009976EeA096a51A948a3dC00e34";

const allocationFilepath = "./amounts.json";

const gasPrice = ethers.utils.parseUnits("300", "gwei");

interface Allocations {
  [account: string]: string;
}

async function main() {
  const accounts = await hre.ethers.getSigners();
  let senderAccount: SignerWithAddress | Signer = accounts[0];

  const factory = new ZeroDAOToken__factory(senderAccount);
  const token = await factory.attach(tokenAddress);

  const allocations: Allocations = JSON.parse(
    fs.readFileSync(allocationFilepath).toString()
  );

  let totalToSend = 0;

  logger.log(`sending to ${Object.keys(allocations).length} accounts`);

  Object.entries(allocations).forEach(([address, amount]) => {
    totalToSend += Number(amount);
    if (!ethers.utils.isAddress(address)) {
      logger.error(`${address} is not a valid address`);
    }
  });

  logger.log(`sending total of ${totalToSend} tokens`);

  let totalGasUsed = BigNumber.from(0);

  const entries = Object.entries(allocations);
  for (let i = 0; i < entries.length; ++i) {
    const address = entries[i][0];
    const amount = entries[i][1];

    const actualSend = BigNumber.from(amount).mul(decimals);

    logger.log(
      `Will send ${ethers.utils.formatEther(
        actualSend.toString()
      )} tokens to ${address}`
    );

    const gasUsed = await token.estimateGas.transfer(address, actualSend);
    totalGasUsed = totalGasUsed.add(gasUsed);
  }

  const totalGasCost = totalGasUsed.mul(gasPrice);
  logger.log(`Estimated gas usage: ${totalGasUsed.toString()}`);
  logger.log(
    `Estimated gas cost: ${ethers.utils.formatEther(totalGasCost)} eth`
  );

  logger.log(`Sending!`);
  for (let i = 0; i < entries.length; ++i) {
    const address = entries[i][0];
    const amount = entries[i][1];

    const actualSend = BigNumber.from(amount).mul(decimals);

    logger.log(
      `Sending ${ethers.utils.formatEther(
        actualSend.toString()
      )} tokens to ${address}`
    );
    const tx = await token.transfer(address, actualSend);
    logger.log(`waiting...`);
    await tx.wait();
  }
}

main();
