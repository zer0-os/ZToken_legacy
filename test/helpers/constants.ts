// Proxy Implementation Storage Slot bytes
// This value is the same for all @OpenZeppelin AdminUpgradeabilityProxy's
export const IMPL_STORAGE_SLOT =
  "0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc";

// ZeroDAOToken Constants
export const DEFAULT_ZERO_TOKEN_NAME = "Wilder World Test";
export const DEFAULT_ZERO_TOKEN_SYMBOL = "tWILD";

// Mock Token Constants
export const DEFAULT_MOCK_TOKEN_NAME = "Mock Token";
export const DEFAULT_MOCK_TOKEN_SYMBOL = "MOCK";
export const DEFAULT_TEST_MOCK_TOKEN_NAME = "Test Mock Token";
export const DEFAULT_TEST_MOCK_TOKEN_SYMBOL = "TMOCK";

// Default Amounts
export const DEFAULT_MOCK_TOKEN_AMOUNT = "500000"; // 500,000 with 6 decimals
export const DEFAULT_MOCK_TOKEN_DECIMALS = 6;
export const DEFAULT_TEST_MINT_AMOUNT = "100000"; // 100,000 with 6 decimals
export const DEFAULT_WITHDRAW_AMOUNT = "50000"; // 50,000 with 6 decimals
export const DEFAULT_TOKEN_MINT_AMOUNT = "1000"; // 1,000 tokens (18 decimals)
export const DEFAULT_TRANSFER_AMOUNT = "100"; // 100 tokens (18 decimals)

// V2 Test Constants
export const DEFAULT_V2_TOKEN_NAME = "Test DAO Token V2";
export const DEFAULT_V2_TOKEN_SYMBOL = "TDT2";
export const DEFAULT_V2_ADDITIONAL_AMOUNT = "100000"; // 100,000 with 6 decimals
export const DEFAULT_V2_TEST_AMOUNT = "1000"; // 1,000 with 6 decimals
export const DEFAULT_V2_INSUFFICIENT_AMOUNT = "2000000"; // 2,000,000 with 6 decimals
export const DEFAULT_V2_MINT_AMOUNT = "1000"; // 1,000 tokens (18 decimals)
export const DEFAULT_V2_BURN_AMOUNT = "100"; // 100 tokens (18 decimals)
export const DEFAULT_V2_PAUSE_TRANSFER_AMOUNT = "1"; // 1 token (18 decimals)
export const DEFAULT_V2_BULK_TRANSFER_AMOUNT = "10"; // 10 tokens (18 decimals)
export const DEFAULT_V2_BULK_TRANSFERFROM_AMOUNT = "5"; // 5 tokens (18 decimals)

// V3 Test Constants
export const DEFAULT_V3_TOKEN_NAME = "Test DAO Token V3";
export const DEFAULT_V3_TOKEN_SYMBOL = "TDT3";
export const DEFAULT_V3_DECIMALS = 18;
export const DEFAULT_V3_INITIAL_MINT_AMOUNT = "10000"; // 10,000 tokens (18 decimals)
export const DEFAULT_V3_INITIAL_SUPPLY = "1000000"; // 1,000,000 tokens (18 decimals)
export const DEFAULT_V3_ABI_TEST_AMOUNT = "1000"; // 1,000 tokens (18 decimals)
export const DEFAULT_V3_ABI_BURN_AMOUNT = "100"; // 100 tokens (18 decimals)
export const DEFAULT_V3_BURN_TRANSFER_AMOUNT = "100"; // 100 tokens (18 decimals)
export const DEFAULT_V3_NORMAL_TRANSFER_AMOUNT = "10"; // 10 tokens (18 decimals)
export const DEFAULT_V3_BULK_TRANSFER_AMOUNT = "5"; // 5 tokens (18 decimals)
export const DEFAULT_V3_BULK_TRANSFERFROM_AMOUNT = "2"; // 2 tokens (18 decimals)

// Network Constants
export const HARDHAT_NETWORK_NAME = "hardhat";

// Logger Names
export const DEPLOY_FUND_TRANSFER_LOGGER = "deploy-fund-transfer";
export const DEPLOY_V2_LOGGER = "deploy-v2";
export const DEPLOY_V3_LOGGER = "deploy-v3";
export const READ_STATE_LOGGER = "read-state";
export const READ_AND_COMPARE_LOGGER = "read-compare-state";

// Messages
export const TRANSFERRING_OWNERSHIP_MESSAGE =
  "Transferring ownership of proxy...";
export const OWNERSHIP_TRANSFERRED_MESSAGE =
  "Ownership transferred successfully";
export const DEPLOYING_V2_MESSAGE = "Deploying ZeroDAOTokenV2 implementation";
export const DEPLOYING_V3_MESSAGE = "Deploying ZeroDAOTokenV3 implementation";
export const READING_POST_UPGRADE_STATE_MESSAGE =
  "Reading post upgrade state...";
export const COMPARING_STATES_MESSAGE =
  "Comparing pre and post upgrade states...";
export const STORAGE_COMPARISON_PASSED_MESSAGE =
  "Storage comparison passed - no differences found";
export const STORAGE_COMPARISON_FAILED_MESSAGE = "Storage comparison failed:";
