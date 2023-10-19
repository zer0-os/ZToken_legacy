import logdown from "logdown";
import * as fs from "fs";

export const deploymentsFolder = "./deployments";

export interface DeploymentData {
  tag?: string;
  address: string;
  version: string;
  date: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  args: { [key: string]: any };
  isUpgradable: boolean;
  admin?: string;
  implementation?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: { [key: string]: any };
}

export interface DeploymentOutput {
  // array must always be sorted from oldest->most recent
  [type: string]: DeploymentData[];
}

const root = "ztoken";

export const getLogger = (title: string): logdown.Logger => {
  const logger = logdown(`${root}::${title}`);
  logger.state.isEnabled = true;
  return logger;
};

export const getDeploymentDataFilepath = (network: string): string => {
  const filepath = `${deploymentsFolder}/${network}.json`;

  return filepath;
};

export const getDeploymentData = (network: string): DeploymentOutput => {
  const filepath = `${deploymentsFolder}/${network}.json`;
  const fileExists = fs.existsSync(filepath);

  if (!fileExists) {
    throw new Error(`No deployment data for ${network}`);
  }

  const fileContents = fs.readFileSync(filepath);
  const data = JSON.parse(fileContents.toString()) as DeploymentOutput;

  return data;
};

export const writeDeploymentData = (
  network: string,
  data: DeploymentOutput
): void => {
  const filepath = `${deploymentsFolder}/${network}.json`;
  const jsonToWrite = JSON.stringify(data, undefined, 2);

  fs.writeFileSync(filepath, jsonToWrite);
};
