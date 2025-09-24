# WILD Token Upgrade Guide: V1 to V2

This document outlines the complete process for upgrading the WILD token from `ZeroDAOToken.sol` (V1) to `ZeroDAOTokenV2.sol` (V2) using a Gnosis Safe multisig wallet.

## Overview

The upgrade adds the ability to withdraw ERC20 tokens (such as USDC) that may be stuck in the token contract. The V2 contract introduces a new `withdrawERC20` function that allows the owner to recover any ERC20 tokens sent to the contract address.

## Key Changes in V2

- Added `withdrawERC20` function to recover stuck ERC20 tokens
- Added `ERC20TokenWithdrawn` event for transparency
- Imported SafeERC20 library for secure token transfers
- Added safety checks to prevent withdrawing the token itself

## Prerequisites

- Access to Gnosis Safe that owns the ProxyAdmin for the WILD token proxy
- Sufficient signers available for multisig transactions
- Mainnet deployment environment configured
- Validation scripts tested and ready

## Step-by-Step Upgrade Process

### Step 1: Create V2 Contract

**Status**: ✅ Complete
- V2 contract already exists at `contracts/ZeroDAOTokenV2.sol`
- Contract includes new `withdrawERC20` functionality
- All existing functionality preserved from V1

### Step 2: Write and Execute Unit Tests

**Status**: ✅ Complete
**Objective**: Ensure V2 contract behavior is correct and upgrade simulation works properly

**Tasks**:
1. **Test V2 Contract Functionality**
   ```bash
   npx hardhat test test/zDaoTokenV2.ts
   ```

2. **Test Upgrade Simulation**
   ```bash
   npx hardhat test scripts/upgrade/upgrade-test.ts
   ```

3. **Verify Storage Compatibility**
   - Confirm storage layout remains unchanged
   - Test that existing balances, allowances, and snapshots are preserved
   - Validate that new functionality works without corrupting existing data

**Key Test Cases**:
- All existing V1 functions work identically in V2
- New `withdrawERC20` function works correctly
- Cannot withdraw the token itself
- Cannot withdraw to zero address
- Only owner can call `withdrawERC20`
- Events are emitted correctly
- Storage slots remain unchanged after upgrade

### Step 3: Deploy V2 Implementation to Mainnet

**Objective**: Deploy the V2 contract to serve as the new implementation

**Command**:
```bash
npx hardhat run scripts/upgrade/02-deploy-v2.ts --network mainnet
```

**Expected Output**:
- V2 implementation contract address
- Gas cost for deployment
- Verification that contract is deployed correctly

**Post-Deployment Verification**:
- Verify contract on Etherscan
- Confirm contract bytecode matches local compilation
- Record implementation address for upgrade transaction

### Step 4: Pre-Upgrade Validation

**Objective**: Capture current state data before upgrade for comparison

**Command**:
```bash
npx hardhat run scripts/upgrade/validate.ts --network mainnet
```

**Data to Capture**:
- Total supply of WILD tokens
- Sample of user balances (top holders)
- Contract owner address
- Paused state
- Authorized snapshotters
- Current snapshot ID
- Any ERC20 token balances in the contract (especially USDC)
- Proxy admin owner
- Current implementation address

**Save Output**: Store validation results in a file for later comparison

### Step 5: Execute Proxy Upgrade via Gnosis Safe

**Objective**: Upgrade the WILD token proxy to use V2 implementation

**Gnosis Safe Transaction Details**:
- **To**: ProxyAdmin contract address
- **Function**: `upgrade(address proxy, address implementation)`
- **Parameters**:
  - `proxy`: WILD token proxy address
  - `implementation`: V2 contract address from Step 3

**Transaction Preparation**:
1. Navigate to Gnosis Safe web interface
2. Go to "New Transaction" > "Contract Interaction"
3. Enter ProxyAdmin contract address
4. Select `upgrade` function
5. Input WILD proxy address and V2 implementation address
6. Review transaction details carefully
7. Submit for signing

**Signing Process**:
1. First signer reviews and signs transaction
2. Additional signers review and sign until threshold reached
3. Final signer executes the transaction
4. Monitor transaction on Etherscan for confirmation

**Post-Upgrade Verification**:
- Confirm transaction succeeded
- Verify proxy now points to V2 implementation
- Check that contract is still functional

### Step 6: Post-Upgrade Validation

**Objective**: Confirm upgrade preserved all data and functionality

**Command**:
```bash
npx hardhat run scripts/upgrade/validate.ts --network mainnet
```

**Validation Checklist**:
- [ ] Total supply unchanged
- [ ] User balances unchanged
- [ ] Contract owner unchanged
- [ ] Paused state unchanged
- [ ] Authorized snapshotters unchanged
- [ ] Snapshot ID unchanged
- [ ] ERC20 token balances in contract unchanged
- [ ] New `withdrawERC20` function is available
- [ ] All existing functions still work

**Compare Results**: Ensure all data matches pre-upgrade validation exactly

### Step 7: Execute Token Withdrawal via Gnosis Safe

**Objective**: Withdraw stuck USDC (or other ERC20 tokens) from the contract

**Prerequisites**:
- Post-upgrade validation passed
- Confirmed V2 upgrade successful
- Identified tokens to withdraw and amounts

**Gnosis Safe Transaction Details**:
- **To**: WILD token proxy address (now running V2)
- **Function**: `withdrawERC20(address token, address to, uint256 amount)`
- **Parameters**:
  - `token`: USDC contract address (or other ERC20 token)
  - `to`: Destination address for withdrawn tokens
  - `amount`: Amount to withdraw (0 for all available)

**Transaction Preparation**:
1. Navigate to Gnosis Safe web interface
2. Go to "New Transaction" > "Contract Interaction"
3. Enter WILD token proxy address
4. Select `withdrawERC20` function
5. Input token address, destination address, and amount
6. Review transaction details carefully
7. Submit for signing

**Signing Process**:
1. First signer reviews and signs transaction
2. Additional signers review and sign until threshold reached
3. Final signer executes the transaction
4. Monitor transaction on Etherscan for confirmation

**Post-Withdrawal Verification**:
- Confirm tokens were transferred to destination address
- Verify `ERC20TokenWithdrawn` event was emitted
- Check that WILD token contract balance is now zero for withdrawn token

## Risk Mitigation

### Pre-Upgrade Risks
- **Storage Corruption**: Mitigated by comprehensive testing and storage layout verification
- **Function Changes**: Mitigated by maintaining identical function signatures and behavior
- **Access Control**: Mitigated by preserving owner and authorization mappings

### Upgrade Risks
- **Transaction Failure**: Mitigated by careful transaction preparation and gas estimation
- **Wrong Implementation**: Mitigated by double-checking implementation address
- **Insufficient Signatures**: Mitigated by coordinating with all required signers

### Post-Upgrade Risks
- **Data Loss**: Mitigated by thorough validation before and after upgrade
- **Function Regression**: Mitigated by testing all existing functionality
- **Unauthorized Access**: Mitigated by maintaining existing access controls

## Rollback Plan

If issues are discovered after upgrade:

1. **Immediate Assessment**: Determine if issue is critical
2. **Pause Contract**: Use existing pause functionality if needed
3. **Deploy Fixed Version**: Create and deploy corrected implementation
4. **Second Upgrade**: Use same Gnosis Safe process to upgrade to fixed version
5. **Re-validate**: Ensure all data and functionality is correct

## Emergency Contacts

- **Technical Lead**: [Contact Information]
- **Gnosis Safe Signers**: [List of signers and contact methods]
- **Deployment Engineer**: [Contact Information]

## Documentation and Audit Trail

- All transactions will be recorded on Ethereum mainnet
- Gnosis Safe provides transaction history and signer records
- Validation script outputs should be saved for audit purposes
- This document serves as the official upgrade procedure record

## Success Criteria

The upgrade is considered successful when:

- [ ] V2 implementation deployed successfully
- [ ] Proxy upgrade transaction confirmed
- [ ] Post-upgrade validation matches pre-upgrade data exactly
- [ ] New `withdrawERC20` function is accessible and functional
- [ ] All existing token functionality works normally
- [ ] Stuck tokens successfully withdrawn to intended destination
- [ ] No unexpected side effects or regressions observed

## Timeline Estimate

- **Step 1**: Already complete
- **Step 2**: 2-4 hours (testing and validation)
- **Step 3**: 30 minutes (deployment)
- **Step 4**: 15 minutes (validation script)
- **Step 5**: 1-2 hours (Gnosis Safe coordination and execution)
- **Step 6**: 15 minutes (validation script)
- **Step 7**: 30 minutes (withdrawal transaction)

**Total Estimated Time**: 4-7 hours (excluding coordination delays)

---

*This document should be reviewed by all stakeholders before beginning the upgrade process. Any questions or concerns should be addressed before proceeding.*
