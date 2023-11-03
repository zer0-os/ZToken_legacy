// eslint-disable-next-line @typescript-eslint/no-var-requires
require("dotenv").config();

import { task, HardhatUserConfig } from "hardhat/config";
import "@nomiclabs/hardhat-waffle";
import "@nomiclabs/hardhat-etherscan";
import "@nomiclabs/hardhat-ethers";
import "@typechain/hardhat";
import "@openzeppelin/hardhat-upgrades";
import "solidity-coverage";
import "hardhat-ignore-warnings";
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
  warnings: {
    "test/**/*.ts": {
      default: "off"
    }
  },
  mocha: {
    timeout: 500000,
  },
  defaultNetwork: "hardhat",
  networks: {
    hardhat: {
      forking: {
        url: process.env.FORK_RPC_URL || "https://mainnet.infura.io/v3/97e75e0bbc6a4419a5dd7fe4a518b917",
        blockNumber: 18192079
        // calls during upgrades mess with some tests when we fork, fix to this block
      },
      // accounts: [
      //   {
      //     privateKey: `${process.env.PRIVATE_KEY}`,
      //     balance: "999999999999999999999"
      //   }
      // ],
    },
    mainnet: {
      url: process.env.RPC_URL || "https://mainnet.infura.io/v3/97e75e0bbc6a4419a5dd7fe4a518b917",
      gasPrice: 80000000000,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    goerli: {
      url: process.env.RPC_URL || "https://goerli.infura.io/v3/77c3d733140f4c12a77699e24cb30c27",
      timeout: 10000000,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    sepolia: {
      url: process.env.RPC_URL || "https://sepolia.infura.io/v3/fc014702aa244f2ea194515e4cbeb77e",
      timeout: 10000000,
      accounts: [
        `0x${process.env.PRIVATE_KEY_A}`,
        `0x${process.env.PRIVATE_KEY_B}`,
        `0x${process.env.PRIVATE_KEY_C}`,
        `0x${process.env.PRIVATE_KEY_D}`,
      ],
    }
  },
  etherscan: {
    apiKey: "FZ1ANB251FC8ISFDXFGFCUDCANSJNWPF9Q",
  },
};
export default config;
