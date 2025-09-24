// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

import { task, HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "solidity-coverage";

task("accounts", "Prints the list of accounts", async (args, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

const config: HardhatUserConfig = {
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
      { version: "0.6.8", settings: {} }
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
    // kovan: {
    //   accounts: { mnemonic: process.env.TESTNET_MNEMONIC || "" },
    //   url: `https://kovan.infura.io/v3/0e6434f252a949719227b5d68caa2657`,
    // },
    // ropsten: {
    //   accounts: { mnemonic: process.env.TESTNET_MNEMONIC || "" },
    //   url: "https://ropsten.infura.io/v3/77c3d733140f4c12a77699e24cb30c27",
    // },
    // rinkeby: {
    //   accounts: { mnemonic: process.env.TESTNET_MNEMONIC || "" },
    //   url: "https://rinkeby.infura.io/v3/77c3d733140f4c12a77699e24cb30c27",
    // },
    sepolia: {
      chainId: 11155111,
      accounts: [`${process.env.TESTNET_PRIVATE_KEY}`],
      url: `${process.env.SEPOLIA_RPC_URL}`,
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
    apiKey: `${process.env.ETHERSCAN_API_KEY}`,
    customChains: [
      {
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://api-sepolia.etherscan.io/api",
          browserURL: "https://sepolia.etherscan.io"
        }
      }

    ]
  },
};
export default config;
