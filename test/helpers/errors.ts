// MeowToken
// export const BALANCE_ERROR = "MeowToken: insufficient balance";
export const ZERO_ERROR = "MeowToken: amount must be greater than 0";

// ERC20
export const ZERO_TO_ADDRESS_ERROR = "ERC20: transfer to the zero address";
export const ZERO_FROM_ADDRESS_ERROR = "ERC20: transfer from the zero address";
export const ALLOWANCE_ERROR = "ERC20: insufficient allowance";
export const BALANCE_ERROR = "ERC20: transfer amount exceeds balance";

// Earlier ERC20 version, used in LiveZeroToken instead
export const LZT_ALLOWANCE_ERROR = "ERC20: transfer total exceeds allowance";
export const MEOW_ALLOWANCE_ERROR = "ERC20: insufficient allowance"