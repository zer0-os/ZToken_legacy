import { BigNumber } from "ethers";
import * as fs from "fs";
import { ethers } from "hardhat";

// TotalWild

// Amount of Zero Tokens User gets = (Amount To Distribute) * (Amount of WILD held by user / Total Wild)

interface HolderFile {
  [address: string]: {
    amount: string;
    revocable: boolean;
  }
}

interface Holders {
  [address: string]: {
    amount: BigNumber;
  }
}

/* --------------------------------- */
/**
 * 
 * Staking Pool Balance of WILD: 1000
 * DAO Treasury Balance of WILD: 5000
 * 
 * Zachary Has    : 100
 * Zachary Staked : 500
 * Zachary Earned (as staking reward) : 100
 * 
 * Zachary is holding: 700
 * 
 */

// WILD Staking Pool: 0x3aC551725ac98C5DCdeA197cEaaE7cDb8a71a2B4 (remove tokens held by this address)
// Remove ~10 million tokens from amount held (rewards for staking)

const totalZEROToGive = ethers.utils.parseEther("202020202").div(3);

const stakingPoolAddress = "0x3aC551725ac98C5DCdeA197cEaaE7cDb8a71a2B4"
const rewardsToRemove = ethers.utils.parseEther("10000000");

const main = async () => {
  const holders: HolderFile = JSON.parse(fs.readFileSync("WILDHolders.json").toString()) as HolderFile;
  const stakers: HolderFile = JSON.parse(fs.readFileSync("WILDstakers.json").toString()) as HolderFile;

  const totalHeldByAccount: Holders = {};
  let totalWILD: BigNumber = BigNumber.from(0);

  for (const [address, holder] of Object.entries(holders)) {
    if (address === stakingPoolAddress) {
      continue;
    }

    let held = totalHeldByAccount[address];
    if (!held) {
      held = {
        amount: BigNumber.from(0)
      }
    }

    const amountHeld = BigNumber.from(holder.amount);

    held.amount = held.amount.add(amountHeld);
    totalHeldByAccount[address] = held;

    totalWILD = totalWILD.add(amountHeld);
  }

  for (const [address, holder] of Object.entries(stakers)) {
    let held = totalHeldByAccount[address];
    if (!held) {
      held = {
        amount: BigNumber.from(0)
      }
    }

    const amountHeld = BigNumber.from(holder.amount);

    held.amount = held.amount.add(amountHeld);
    totalHeldByAccount[address] = held;
  }

  totalWILD = totalWILD.sub(rewardsToRemove);

  const zeroTokensOwed: HolderFile = {};

  for (const [address, holder] of Object.entries(totalHeldByAccount)) {
    const amountOwed = (holder.amount.mul(totalZEROToGive)).div(totalWILD);
    if (amountOwed.eq(BigNumber.from(0))) {
      continue;
    }

    zeroTokensOwed[address] = {
      amount: amountOwed.toString(),
      revocable: false
    }
  }

  fs.writeFileSync("zeroQDO-sep2022.json", JSON.stringify(zeroTokensOwed, undefined, 2));


}

main().catch(console.error);