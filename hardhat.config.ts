// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

import { task, HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";
import "./tasks/merkle";
import "./tasks/deploy";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
  typechain: {
    outDir: "typechain",
    target: "ethers-v5",
  },
  solidity: {
    compilers: [
      {
        version: "0.8.3",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
  },
  mocha: {
    timeout: 50000,
  },
  networks: {
    hardhat: {
      forking: {
        url:
          "https://eth-mainnet.alchemyapi.io/v2/MnO3SuHlzuCydPWE1XhsYZM_pHZP8_ix",
        blockNumber: 13665280,
      },
    },
    mainnet: {
      accounts: [`0x${process.env.MAINNET_PRIVATE_KEY}`],
      url: `https://eth-mainnet.alchemyapi.io/v2/MnO3SuHlzuCydPWE1XhsYZM_pHZP8_ix`,
      gasPrice: "auto",
    },
    kovan: {
      accounts: { mnemonic: process.env.TESTNET_MNEMONIC || "" },
      url: `https://kovan.infura.io/v3/0e6434f252a949719227b5d68caa2657`,
    },
    ropsten: {
      accounts: { mnemonic: process.env.TESTNET_MNEMONIC || "" },
      url: "https://ropsten.infura.io/v3/77c3d733140f4c12a77699e24cb30c27",
    },
    rinkeby: {
      accounts: { mnemonic: process.env.TESTNET_MNEMONIC || "" },
      url: "https://rinkeby.infura.io/v3/77c3d733140f4c12a77699e24cb30c27",
    },
    localhost: {
      gas: "auto",
      gasPrice: "auto",
      gasMultiplier: 1,
      url: "http://127.0.0.1:8545",
      chainId: 1776,
      accounts: {
        mnemonic: "test test test test test test test test test test test test",
      },
    },
  },
  etherscan: {
    apiKey: "FZ1ANB251FC8ISFDXFGFCUDCANSJNWPF9Q",
  },
};
export default config;
