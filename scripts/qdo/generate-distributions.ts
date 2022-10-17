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

interface StakerFile {
  [address: string]: {
    amount: string;
    rewards: string;
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
const rewardsVault = "0x4Afc79F793fD4445f4fd28E3aa708c1475a43Fc4";

const main = async () => {
  const holders: HolderFile = JSON.parse(fs.readFileSync("WILDHolders.json").toString()) as HolderFile;
  const stakers: StakerFile = JSON.parse(fs.readFileSync("WILDstakers.json").toString()) as StakerFile;

  const totalHeldByAccount: Holders = {};
  let totalWILD: BigNumber = BigNumber.from(0);
  let totalAmountRewarded = BigNumber.from(0);

  for (const [address, holder] of Object.entries(holders)) {
    let amountHeld = BigNumber.from(holder.amount);
    let held = totalHeldByAccount[address];
    if (!held) {
      held = {
        amount: BigNumber.from(0)
      }
    }


    held.amount = held.amount.add(amountHeld);
    totalHeldByAccount[address] = held;

    totalWILD = totalWILD.add(amountHeld);
  }

  let amountStaked = BigNumber.from(0);

  for (const [address, staker] of Object.entries(stakers)) {
    let holder = totalHeldByAccount[address];
    if (!holder) {
      holder = {
        amount: BigNumber.from(0)
      }
    }

    // staked amount
    const amountHeld = BigNumber.from(staker.amount);
    holder.amount = holder.amount.add(amountHeld);
    amountStaked = amountStaked.add(amountHeld);
    totalWILD = totalWILD.add(amountHeld);

    // rewards
    const amountRewarded = BigNumber.from(staker.rewards);
    holder.amount = holder.amount.add(amountRewarded);
    totalAmountRewarded = totalAmountRewarded.add(amountRewarded);

    totalHeldByAccount[address] = holder;
  }

  totalHeldByAccount[rewardsVault].amount = totalHeldByAccount[rewardsVault].amount.sub(totalAmountRewarded);
  totalHeldByAccount[stakingPoolAddress].amount = BigNumber.from(0);
  totalWILD = totalWILD.sub(amountStaked);

  const zeroTokensOwed: HolderFile = {};
  let totalOwed = BigNumber.from(0);

  for (const [address, holder] of Object.entries(totalHeldByAccount)) {
    const amountOwed = (holder.amount.mul(totalZEROToGive)).div(totalWILD);
    if (amountOwed.eq(BigNumber.from(0))) {
      continue;
    }

    totalOwed = totalOwed.add(amountOwed);

    zeroTokensOwed[address] = {
      amount: amountOwed.toString(),
      revocable: false
    }
  }

  console.log(`total owed: ${ethers.utils.formatEther(totalOwed)}`);
  console.log(`total wild: ${ethers.utils.formatEther(totalWILD)}`);
  console.log(`amount staked: ${ethers.utils.formatEther(amountStaked)}`);
  console.log(`amount rewarded: ${ethers.utils.formatEther(totalAmountRewarded)}`);

  fs.writeFileSync("zeroQDO-sep2022.json", JSON.stringify(zeroTokensOwed, undefined, 2));
}

main().catch(console.error);