# ORB402 Integration Guide

## Quick Start

### Installation

```bash
npm install @orb402/privacy-sdk ethers
```

### Basic Configuration

```typescript
import { createConfig } from '@orb402/privacy-sdk';

const config = createConfig({
  chain: 'base',
  rpcUrl: 'https://mainnet.base.org',
  privacyPoolAddress: '0x_YOUR_POOL_ADDRESS',
  depositRouterAddress: '0x_YOUR_ROUTER_ADDRESS',
  token: 'USDC',
  defaultPrivacyLevel: 'enhanced',
});
```

## Deposit Flow

```typescript
import { buildEvmDeposit } from '@orb402/privacy-sdk';

const deposit = buildEvmDeposit(
  {
    wallet: userAddress,
    amount: 100, // $100 USDC
    token: 'USDC',
    privacyLevel: 'full',
  },
  {
    tokenAddress: config.resolvedTokenAddress,
    routerAddress: config.depositRouterAddress,
    privacyLevel: 'full',
  },
);

// User signs approval tx (if needed)
if (deposit.needsApproval) {
  await signer.sendTransaction(deposit.approveTransaction);
}

// User signs deposit tx
await signer.sendTransaction(deposit.depositTransaction);
```

## Private Transfer

```typescript
import { executeBaseTransfer } from '@orb402/privacy-sdk';

const result = await executeBaseTransfer(
  {
    senderWallet: '0xSender...',
    recipientWallet: '0xRecipient...',
    amount: 50,
    token: 'USDC',
  },
  {
    privacyPoolAddress: config.privacyPoolAddress,
    tokenAddress: config.resolvedTokenAddress,
    signer: intermediateWalletSigner,
    recipientIsOrb402User: true, // internal transfer
  },
);

if (result.success) {
  console.log(`Transfer confirmed: ${result.txHash}`);
}
```

## Withdrawal

```typescript
import { executeBaseWithdrawal, calculateWithdrawalFees } from '@orb402/privacy-sdk';

// Preview fees
const fees = calculateWithdrawalFees(200, 0.5); // 50% discount
console.log(`Fee: ${fees.feeAmount}, Receive: ${fees.amountAfterFees}`);

// Execute withdrawal
const result = await executeBaseWithdrawal(
  {
    senderWallet: intermediateWallet,
    recipient: externalWallet,
    amount: 200,
    token: 'USDC',
    nonce: 0,
  },
  {
    privacyPoolAddress: config.privacyPoolAddress,
    tokenAddress: config.resolvedTokenAddress,
    signer: intermediateWalletSigner,
    feeDiscount: 0.5,
  },
);
```

## Privacy Levels

| Level | Obfuscation | Splitting | Delay | Use Case |
|-------|------------|-----------|-------|----------|
| `standard` | No | No | None | Fast transfers, low privacy need |
| `enhanced` | Yes | No | 5-30s | Default — good balance |
| `full` | Yes | Yes | 10-120s | Maximum privacy |

## Checking Balances

```typescript
import { PoolClient } from '@orb402/privacy-sdk';

const pool = new PoolClient(config.privacyPoolAddress, config.rpcUrl);
const balance = await pool.getBalance(userAddress, tokenAddress);

console.log(`Available: ${balance.available}`);
console.log(`Locked: ${balance.locked}`);
```

## Error Handling

All SDK functions return typed results. Transfer and withdrawal functions return `{ success: boolean, error?: string }` — they never throw.

```typescript
const result = await executeBaseTransfer(params, config);
if (!result.success) {
  console.error('Transfer failed:', result.error);
}
```
