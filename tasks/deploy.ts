import { task } from "hardhat/config";
import {
  DeploymentData,
  DeploymentOutput,
  deploymentsFolder,
  getDeploymentData,
  getLogger,
  writeDeploymentData,
} from "../utilities";

import * as fs from "fs";
import { SignerWithAddress } from "@nomiclabs/hardhat-ethers/signers";
import {
  hashBytecodeWithoutMetadata,
  Manifest,
} from "@openzeppelin/upgrades-core";
import { Contract, ContractFactory } from "ethers";
import { MerkleInfo } from "../utilities/helpers";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const logger = getLogger("tasks::deploy");

interface DeployedContract {
  isUpgradable: boolean;
  instance: Contract;
  version: string;
  date: string;
}

interface UpgradableDeployedContract extends DeployedContract {
  implementationAddress: string;
  admin: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const deployContract = async (factory: ContractFactory, args: any[]) => {
  const bytecodeHash = hashBytecodeWithoutMetadata(factory.bytecode);

  logger.debug(`Implementation version is ${bytecodeHash}`);

  const instance = await factory.deploy(factory, ...args);

  logger.log(`Deployed contract to ${instance.address}`);

  const deploymentData: DeployedContract = {
    isUpgradable: false,
    instance,
    version: bytecodeHash,
    date: new Date().toISOString(),
  };

  return deploymentData;
};

const deployUpgradableContract = async (
  hre: HardhatRuntimeEnvironment,
  factory: ContractFactory,
  args: unknown[] | undefined
) => {
  const bytecodeHash = hashBytecodeWithoutMetadata(factory.bytecode);

  logger.debug(`Implementation version is ${bytecodeHash}`);

  const instance = await hre.upgrades.deployProxy(factory, args, {
    initializer: "initialize",
  });
  await instance.deployed();

  logger.log(`Deployed contract to ${instance.address}`);

  const ozUpgradesManifestClient = await Manifest.forNetwork(
    hre.network.provider
  );
  const manifest = await ozUpgradesManifestClient.read();
  const implementationContract = manifest.impls[bytecodeHash];

  if (!manifest.admin) {
    throw Error(`No admin address?`);
  }

  if (!implementationContract) {
    throw Error(`No implementation contract?`);
  }

  const deploymentData: UpgradableDeployedContract = {
    isUpgradable: true,
    instance,
    implementationAddress: implementationContract.address,
    version: bytecodeHash,
    date: new Date().toISOString(),
    admin: manifest.admin.address,
  };

  return deploymentData;
};

const checkUniqueTag = (tag: string, deployments: DeploymentData[]) => {
  const numMatches = deployments.filter((d) => {
    if (!d.tag) {
      return false;
    }
    return d.tag.toLowerCase() === tag.toLowerCase();
  }).length;

  logger.warn(
    `There are ${numMatches} deployments with the same tag of ${tag}`
  );
};

const saveDeploymentData = async (
  hre: HardhatRuntimeEnvironment,
  type: string,
  deployment: DeployedContract | UpgradableDeployedContract,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { [key: string]: any },
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: { [key: string]: any },
  tag?: string
) => {
  let deploymentData: DeploymentOutput = {};

  try {
    const existingData = getDeploymentData(hre.network.name);
    deploymentData = existingData;
  } catch (e) {
    // create folder
    logger.debug(`no existing deployments found, creating folder`);
    fs.mkdirSync(deploymentsFolder, { recursive: true });
  }

  if (!deploymentData[type]) {
    deploymentData[type] = [];
  }

  const deployments = deploymentData[type];

  let implementation: string | undefined;
  let admin: string | undefined;

  // extract extra data if this is an upgradable contract
  if (deployment.isUpgradable) {
    const upgradableDeployment = deployment as UpgradableDeployedContract;
    implementation = upgradableDeployment.implementationAddress;
    admin = upgradableDeployment.admin;
  }

  const finalTag = tag || "untagged";

  checkUniqueTag(finalTag, deployments);

  logger.log(`Registering new deployment of ${type} with tag '${finalTag}'`);
  const deploymentInstance: DeploymentData = {
    tag,
    address: deployment.instance.address,
    version: deployment.version,
    date: deployment.date,
    args,
    isUpgradable: deployment.isUpgradable,
    admin,
    implementation,
    metadata,
  };

  deployments.push(deploymentInstance);

  writeDeploymentData(hre.network.name, deploymentData);
  logger.log(`Updated ${hre.network.name} deployment file.`);
};

export const doDeployToken = async (
  hre: HardhatRuntimeEnvironment,
  deployer: SignerWithAddress,
  name: string,
  symbol: string,
  tag?: string
): Promise<UpgradableDeployedContract> => {
  const factory = await hre.ethers.getContractFactory("ZeroToken", deployer);
  logger.debug(`Deploying token contract...`);
  const deploymentData = await deployUpgradableContract(hre, factory, [
    name,
    symbol,
  ]);
  logger.debug(`Saving deployment data...`);
  await saveDeploymentData(
    hre,
    "token",
    deploymentData,
    {
      name,
      symbol,
    },
    undefined,
    tag
  );

  return deploymentData;
};

export interface MerkleAirdropDeploymentParams {
  token: string;
  merkleRoot: string;
  merkleFile: string;
}

export const doDeployAirdrop = async (
  hre: HardhatRuntimeEnvironment,
  deployer: SignerWithAddress,
  params: MerkleAirdropDeploymentParams,
  tag?: string
): Promise<DeployedContract> => {
  const factory = await hre.ethers.getContractFactory(
    "MerkleTokenAirdrop",
    deployer
  );
  logger.debug(`Deploying Merkle Airdrop Contract...`);
  const deploymentData = await deployContract(factory, [
    params.token,
    params.merkleRoot,
  ]);

  logger.debug(`Saving deployment data...`);
  await saveDeploymentData(
    hre,
    "airdrop",
    deploymentData,
    {
      token_: params.token,
      merkleRoot_: params.merkleRoot,
    },
    {
      merkleFile: params.merkleFile,
    },
    tag
  );

  return deploymentData;
};

export interface MerkleVestingDeploymentParams {
  token: string;
  merkleRoot: string;
  startBlock: number;
  cliff: number;
  duration: number;
  merkleFile: string;
}

export const doDeployVesting = async (
  hre: HardhatRuntimeEnvironment,
  deployer: SignerWithAddress,
  params: MerkleVestingDeploymentParams,
  tag?: string
): Promise<UpgradableDeployedContract> => {
  const factory = await hre.ethers.getContractFactory(
    "MerkleTokenVestingV2",
    deployer
  );
  logger.debug(`Deploying Merkle Vesting Contract...`);
  const deploymentData = await deployUpgradableContract(hre, factory, [
    params.startBlock,
    params.cliff,
    params.duration,
    params.token,
    params.merkleRoot,
  ]);

  logger.debug(`Saving deployment data...`);
  await saveDeploymentData(
    hre,
    "vesting",
    deploymentData,
    {
      start: params.startBlock,
      cliff: params.cliff,
      duration: params.duration,
      token: params.token,
      _merkleRoot: params.merkleRoot,
    },
    {
      merkleFile: params.merkleFile,
    },
    tag
  );

  return deploymentData;
};

const killWithError = (error: string) => {
  logger.error(error);
  throw new Error(error);
};

task("deploy", "Deploys contracts")
  .addPositionalParam(
    "contract",
    "Which contract to deploy: 'token', 'airdrop', 'vesting'"
  )
  .addOptionalParam(
    "merkle",
    "Merkle tree file to use (required when deploying 'airdrop' or 'vesting')"
  )
  .addOptionalParam("symbol", "Token symbol (required when deploying 'token')")
  .addOptionalParam("name", "Token Name (required when deploying 'token')")
  .addOptionalParam(
    "token",
    "The token address to target with a 'airdrop' or 'vesting' contract. (required when deploying 'vesting' or 'airdrop')"
  )
  .addOptionalParam(
    "start",
    "Vesting start block (required when deploying 'vesting')"
  )
  .addOptionalParam(
    "cliff",
    "Vesting cliff (in blocks) (required when deploying 'vesting')"
  )
  .addOptionalParam(
    "duration",
    "Vesting duration (in blocks) (required when deploying 'vesting')"
  )
  .addOptionalParam("tag", "Optional tag for the deployment")
  .setAction(async (taskArguments, hre: HardhatRuntimeEnvironment) => {
    await hre.run("compile");

    if (
      taskArguments.contract != "token" &&
      taskArguments.contract != "airdrop" &&
      taskArguments.contract != "vesting"
    ) {
      killWithError(
        `'contract' positional argument of '${taskArguments.contract}' is not valid. Use 'token' 'vesting' or 'airdrop'`
      );
    }

    if (
      taskArguments.contract == "airdrop" ||
      taskArguments.contract == "vesting"
    ) {
      if (!taskArguments.merkle) {
        killWithError(
          `param 'merkle' must be set when deploying a 'vesting' or 'airdrop' contract.`
        );
      }
      if (!fs.existsSync(taskArguments.merkle)) {
        killWithError(
          `Cannot open file '${taskArguments.merkle}' as merkle tree`
        );
      }
    }

    if (taskArguments.contract == "token") {
      if (!taskArguments.name) {
        killWithError(
          `No 'name' param which is required when deploying a token. Use --name`
        );
      }

      if (!taskArguments.symbol) {
        killWithError(
          `No 'symbol' param which is required when deploying a token. Use --symbol`
        );
      }
    }

    logger.log(`Deploying to ${hre.network.name}`);

    const accounts = await hre.ethers.getSigners();
    const deploymentAccount = accounts[0];

    logger.log(
      `'${deploymentAccount.address}' will be used as the deployment account`
    );

    if (taskArguments.contract == "token") {
      await doDeployToken(
        hre,
        deploymentAccount,
        taskArguments.name,
        taskArguments.symbol,
        taskArguments.tag
      );
    }

    if (
      taskArguments.contract == "vesting" ||
      taskArguments.contract == "airdrop"
    ) {
      const checkFile = async (pattern: string) => {
        if (
          (taskArguments.merkle as string).toLowerCase().lastIndexOf(pattern) >=
          0
        ) {
          logger.warn(
            `Found ${pattern} in the name of the merkle file path used for this deployment.`
          );
          logger.warn(
            `WARNING: This probably isn't the proper merkle file for this type of deployment.`
          );
        }
      };

      if (taskArguments.contract == "vesting") {
        await checkFile("airdrop");
      }
      if (taskArguments.contract == "airdrop") {
        await checkFile("vesting");
      }

      const merkleFileContents = JSON.parse(
        fs.readFileSync(taskArguments.merkle).toString()
      ) as MerkleInfo;

      if (
        !merkleFileContents.merkleRoot ||
        typeof merkleFileContents.merkleRoot != "string"
      ) {
        killWithError(
          `None or an invalid merkle root found in merkle file from --merkle`
        );
      }

      const targetToken = taskArguments.token as string;
      if (!targetToken) {
        killWithError(`No token address given with --token`);
      }
      if (!hre.ethers.utils.isAddress(targetToken)) {
        killWithError(`Passed token ${targetToken} is not a valid address!`);
      }

      if (taskArguments.contract == "vesting") {
        const start = Number(taskArguments.start);
        const cliff = Number(taskArguments.cliff);
        const duration = Number(taskArguments.duration);

        if (!start || typeof start != "number") {
          killWithError(`invalid start given, use --start with a number`);
        }

        if ((!cliff && cliff != 0) || typeof cliff != "number") {
          killWithError(`invalid cliff given, use --cliff with a number`);
        }

        if ((!duration && duration != 0) || typeof duration != "number") {
          killWithError(`invalid duration given, use --duration with a number`);
        }

        if (cliff > duration) {
          killWithError(`duration must be greater than cliff`);
        }

        const currentBlock = await hre.ethers.provider.getBlockNumber();
        if (start < currentBlock) {
          logger.warn(
            `start block is less than the current block number of ${currentBlock}, this may not be what you want.`
          );
        }

        const params: MerkleVestingDeploymentParams = {
          token: targetToken,
          merkleRoot: merkleFileContents.merkleRoot,
          startBlock: start,
          cliff,
          duration,
          merkleFile: taskArguments.merkle,
        };

        await doDeployVesting(
          hre,
          deploymentAccount,
          params,
          taskArguments.tag
        );
      }

      if (taskArguments.contract == "airdrop") {
        const params: MerkleAirdropDeploymentParams = {
          token: targetToken,
          merkleRoot: merkleFileContents.merkleRoot,
          merkleFile: taskArguments.merkle,
        };

        await doDeployAirdrop(
          hre,
          deploymentAccount,
          params,
          taskArguments.tag
        );
      }
    }
  });
