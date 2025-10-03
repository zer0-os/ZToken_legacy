import { ContractFactory } from "ethers";

export const initImpl = async (
  contractFactory: ContractFactory,
  implAddress: string
): Promise<string> => {
  const impl = contractFactory.attach(implAddress);

  await impl.initializeImplementation();

  return impl.owner();
};
