import { ethers } from "hardhat";

const getCurrentBlock = async () => {
  const currentBlockNumber = await ethers.provider.getBlockNumber();
  const currentBlock = await ethers.provider.getBlock(currentBlockNumber);
  return currentBlock;
};

const secondsPerBlock = 13;
const targetDate = new Date("5/2/2021 12:00:00 PST");
console.log(targetDate);

const calculate = async () => {
  const currentBlock = await getCurrentBlock();
  const curTime = currentBlock.timestamp;
  const diff = targetDate.getTime() / 1000 - curTime;
  const numBlocks = diff / secondsPerBlock;
  const targetBlockEstimate = currentBlock.number + numBlocks;
  console.log(
    `Estimated ${targetDate.toLocaleDateString()} to be block number ${targetBlockEstimate}`
  );
};

calculate();
