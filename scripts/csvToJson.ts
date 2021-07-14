import * as fs from "fs";
import csv from "csv-parser";
import { ethers } from "ethers";

const filepath = "./v3vesting.csv";
const outputFile = "./merkle-input.json";

interface VestingAward {
  account: string;
  amount: number;
}

interface VestingAllocation {
  amount: string;
  revocable: boolean;
}

interface VestingMerkleInput {
  [account: string]: VestingAllocation | undefined;
}

function readCSVFile<T>(path: string): Promise<T[]> {
  const p = new Promise<T[]>((resolve) => {
    const results: T[] = [];

    fs.createReadStream(path)
      .pipe(
        csv({
          headers: ["account", "amount"],
          mapValues: ({ header, index, value }) => {
            if (header == "account") {
              return value.toLowerCase();
            }

            if (header == "amount") {
              return parseInt((value as string).replace(/,/g, ""));
            }
          },
        })
      )
      .on("data", (data: T) => {
        results.push(data);
      })
      .on("end", () => {
        resolve(results);
      });
  });

  return p;
}

const main = async () => {
  const awards = await readCSVFile<VestingAward>(filepath);

  const merkleInput: VestingMerkleInput = {};

  awards.forEach((award: VestingAward) => {
    const allocation: VestingAllocation = {
      amount: ethers.utils.parseEther(award.amount.toString()).toString(),
      revocable: false,
    };

    if (merkleInput[award.account]) {
      const valuesMatch =
        allocation.amount === merkleInput[award.account]!.amount;

      if (!valuesMatch) {
        console.error(
          `duplicate entry on ${award.account} and award amounts do not match!`
        );
      } else {
        console.warn(`duplicate entry on ${award.account}`);
      }
    }

    merkleInput[award.account] = allocation;
  });

  console.log(`writing to ${outputFile}`);
  fs.writeFileSync(outputFile, JSON.stringify(merkleInput, undefined, 2));
};

main();
