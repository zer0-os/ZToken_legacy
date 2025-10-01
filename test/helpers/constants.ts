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

// Network Constants
export const HARDHAT_NETWORK_NAME = "hardhat";

// Logger Names
export const DEPLOY_FUND_TRANSFER_LOGGER = "deploy-fund-transfer";
export const DEPLOY_V2_LOGGER = "deploy-v2";
export const READ_STATE_LOGGER = "read-state"
export const READ_AND_COMPARE_LOGGER = "read-compare-state";

// Messages
export const TRANSFERRING_OWNERSHIP_MESSAGE = "Transferring ownership of proxy...";
export const OWNERSHIP_TRANSFERRED_MESSAGE = "Ownership transferred successfully";
export const DEPLOYING_V2_MESSAGE = "Deploying ZeroDAOTokenV2 implementation";
export const READING_POST_UPGRADE_STATE_MESSAGE = "Reading post upgrade state...";
export const COMPARING_STATES_MESSAGE = "Comparing pre and post upgrade states...";
export const STORAGE_COMPARISON_PASSED_MESSAGE = "Storage comparison passed - no differences found";
export const STORAGE_COMPARISON_FAILED_MESSAGE = "Storage comparison failed:";
