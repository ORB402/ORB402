# ORB402 Privacy System Architecture

## Overview

ORB402 implements a ZK-proof-based privacy transfer system on Base (EVM) and Solana. The core idea is a **privacy pool** — a smart contract that acts as a mixing layer between senders and recipients.

## How It Works

```
Sender → [Deposit] → Privacy Pool → [Transfer] → Recipient
                         ↑
                    ZK Proof Gate
```

1. **Deposit**: User deposits tokens into the privacy pool
2. **Proof Upload**: User generates a ZK proof authorizing a transfer amount
3. **Transfer**: Pool executes the transfer, consuming the proof

On-chain observers see tokens moving from the pool contract — not from the original sender.

## Components

### Privacy Pool (`IORB402PrivacyPool`)
- Holds user balances
- Verifies and stores ZK proofs
- Executes transfers (internal and external)

### Deposit Router (`IDepositRouter`)
- Simplifies deposits to a single transaction
- Handles token approval atomically

### ZK Proof System
- **Nonce**: Random, uncorrelated with the sender or timing
- **Proof**: Groth16/PLONK proof of sufficient balance
- **Commitment**: Pedersen commitment to the transfer amount
- **Blinding Factor**: Prevents amount correlation

### Privacy Features
- **Amount Obfuscation**: Adds noise to transfer amounts
- **Split Transfers**: Breaks large transfers into randomized chunks
- **Random Delays**: Prevents timing correlation
- **Holding Wallets**: Deterministic intermediate wallets for deposits

## Transfer Types

### Internal Transfer
Pool balance → Pool balance. Both sender and recipient remain in the pool. Maximum privacy — no tokens leave the contract.

### External Transfer
Pool balance → External wallet. Tokens leave the pool to the recipient. A relayer fee covers gas costs.

## Fee Structure

| Fee | Rate | Discountable |
|-----|------|--------------|
| Withdrawal | 1.0% | Yes (via token holdings) |
| Pool Maintenance | 0.5% | No |

Token holders receive tiered discounts on the withdrawal fee:

| Tier | Min Tokens | Discount |
|------|-----------|----------|
| Bronze | 100 | 10% |
| Silver | 1,000 | 25% |
| Gold | 10,000 | 50% |
| Platinum | 100,000 | 75% |

## Directory Structure

```
src/
├── index.ts              # Public API exports
├── types/index.ts        # Type definitions
├── constants/index.ts    # Chain configs, fee tiers, limits
├── core/
│   ├── config.ts         # SDK configuration
│   └── pool.ts           # Pool client (read-only queries)
├── lib/
│   └── privacy-utils.ts  # Privacy primitives
├── utils/
│   ├── encoding.ts       # Amount/byte encoding
│   ├── validation.ts     # Input validation
│   └── index.ts          # Utility exports
└── zk/
    ├── deposit.ts        # Deposit flow
    ├── upload-proof.ts   # Proof upload
    ├── transfer.ts       # Private transfers
    └── withdraw.ts       # Withdrawals
```
