/**
 * ORB402 — Private Transfer Example
 *
 * This example demonstrates the complete flow for executing a private transfer
 * using the ORB402 ZK privacy system on Base (EVM).
 *
 * Prerequisites:
 * - An ORB402PrivacyPool contract deployed on Base
 * - A funded intermediate wallet with pool balance
 * - ethers.js v6+
 *
 * Flow Overview:
 * 1. Create a holding wallet and deposit USDC
 * 2. Upload a ZK proof authorizing the transfer amount
 * 3. Execute a private transfer (internal or external)
 * 4. (Optional) Withdraw to an external address
 */

import { ethers } from 'ethers';
import {
  generatePrivacyNonce,
  getProofId,
  generateMockProof,
  calculateSplits,
  calculateSplitSchedule,
  obfuscateAmountForPrivacy,
} from '../src/lib/privacy-utils';
import { generateHoldingWallet, generateDepositId, buildEvmDeposit } from '../src/zk/deposit';
import { buildEvmProofUpload } from '../src/zk/upload-proof';
import { executeBaseTransfer } from '../src/zk/transfer';
import { executeBaseWithdrawal, calculateWithdrawalFees } from '../src/zk/withdraw';

// ============================================================================
// Configuration (replace with your values)
// ============================================================================

const CONFIG = {
  // Base chain RPC
  rpcUrl: 'https://mainnet.base.org',

  // ORB402PrivacyPool contract address
  privacyPoolAddress: '0x_YOUR_PRIVACY_POOL_ADDRESS',

  // Token addresses on Base
  usdcAddress: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base

  // DepositRouter address (handles approve + deposit atomically)
  depositRouterAddress: '0x_YOUR_DEPOSIT_ROUTER_ADDRESS',
};

// ============================================================================
// Example 1: Deposit USDC into the Privacy Pool
// ============================================================================

async function exampleDeposit() {
  console.log('=== Example 1: Deposit USDC ===\n');

  const userWallet = '0xYourWalletAddress';
  const depositAmount = 100; // $100 USDC
  const token = 'USDC' as const;

  // Step 1: Build deposit transactions
  const deposit = buildEvmDeposit(
    { wallet: userWallet, amount: depositAmount, token, privacyLevel: 'full' },
    {
      tokenAddress: CONFIG.usdcAddress,
      routerAddress: CONFIG.depositRouterAddress,
      privacyLevel: 'full',
    },
  );

  console.log(`Holding Wallet: ${deposit.holdingWalletAddress}`);
  console.log(`Deposit ID: ${deposit.depositId}`);
  console.log(`Needs Approval: ${deposit.needsApproval}`);

  // Step 2: User signs approval transaction (if needed)
  if (deposit.needsApproval && deposit.approveTransaction) {
    console.log('\nApproval TX:');
    console.log(`  To: ${deposit.approveTransaction.to}`);
    console.log(`  Data: ${deposit.approveTransaction.data.slice(0, 20)}...`);
    // In production: await signer.sendTransaction(deposit.approveTransaction);
  }

  // Step 3: User signs deposit transaction
  console.log('\nDeposit TX:');
  console.log(`  To: ${deposit.depositTransaction.to}`);
  console.log(`  Value: ${deposit.depositTransaction.value} (ETH for gas)`);
  // In production: await signer.sendTransaction(deposit.depositTransaction);

  console.log('\nDeposit prepared! User signs these transactions in their wallet.\n');
}

// ============================================================================
// Example 2: Private Transfer (with Amount Obfuscation)
// ============================================================================

async function exampleTransfer() {
  console.log('=== Example 2: Private Transfer ===\n');

  const senderWallet = '0xSenderAddress';
  const recipientWallet = '0xRecipientAddress';
  const amount = 50; // $50 USDC

  // Step 1: Obfuscate the amount (prevents correlation attacks)
  const { obfuscatedAmount, difference, method } = obfuscateAmountForPrivacy(amount);
  console.log(`Original amount: $${amount}`);
  console.log(`Obfuscated amount: $${obfuscatedAmount.toFixed(2)} (${method}, +$${difference.toFixed(2)})`);

  // Step 2: Generate privacy nonce and proof
  const nonce = generatePrivacyNonce(senderWallet);
  const proofId = getProofId(nonce);
  console.log(`\nPrivacy Nonce: ${nonce}`);
  console.log(`Proof ID: ${proofId}`);

  // Step 3: Generate ZK proof (mock — replace with real proving system)
  const amountInUnits = ethers.parseUnits(amount.toString(), 6);
  const proof = generateMockProof(senderWallet, amountInUnits, nonce);
  console.log(`\nProof: ${proof.proofBytes.slice(0, 20)}...`);
  console.log(`Commitment: ${proof.commitmentBytes.slice(0, 20)}...`);

  // Step 4: Execute the transfer
  // In production, this uses an intermediate wallet signer:
  //
  // const result = await executeBaseTransfer(
  //   { senderWallet, recipientWallet, amount, token: 'USDC' },
  //   {
  //     privacyPoolAddress: CONFIG.privacyPoolAddress,
  //     tokenAddress: CONFIG.usdcAddress,
  //     signer: intermediateWalletSigner,
  //     recipientIsOrb402User: true,  // internal transfer
  //   },
  // );
  //
  // console.log(`Transfer ${result.success ? 'succeeded' : 'failed'}: ${result.txHash}`);

  console.log('\nTransfer would execute 3 steps:');
  console.log('  1. Upload proof to ORB402PrivacyPool contract');
  console.log('  2. Determine internal vs external transfer');
  console.log('  3. Execute internalTransfer() or externalTransfer()');
  console.log();
}

// ============================================================================
// Example 3: Privacy Mixing (Split Transfer)
// ============================================================================

async function exampleSplitTransfer() {
  console.log('=== Example 3: Split Transfer (Privacy Mixing) ===\n');

  const totalAmount = 500_000_000n; // $500 USDC in 6-decimal units

  // Calculate splits
  const splits = calculateSplits(totalAmount);
  const schedule = calculateSplitSchedule(splits.length);

  console.log(`Total: $${Number(totalAmount) / 1_000_000}`);
  console.log(`Splits: ${splits.length}\n`);

  splits.forEach((split, i) => {
    const amountUsd = (Number(split) / 1_000_000).toFixed(2);
    const time = schedule[i].toLocaleTimeString();
    console.log(`  Split ${i + 1}: $${amountUsd} at ${time}`);
  });

  console.log('\nEach split is sent as a separate transaction with random delays.');
  console.log('This prevents amount and timing correlation analysis.\n');
}

// ============================================================================
// Example 4: Withdrawal with Fee Calculation
// ============================================================================

async function exampleWithdrawal() {
  console.log('=== Example 4: Withdrawal ===\n');

  const amount = 200; // $200 USDC

  // Calculate fees (no discount)
  const fees = calculateWithdrawalFees(amount);
  console.log(`Withdrawal amount: $${amount}`);
  console.log(`Fee: $${fees.feeAmount.toFixed(2)} (${fees.totalFeePercent}%)`);
  console.log(`Amount received: $${fees.amountAfterFees.toFixed(2)}`);

  // Calculate fees (with token holder discount)
  const discountedFees = calculateWithdrawalFees(amount, 0.5); // 50% discount
  console.log(`\nWith 50% holder discount:`);
  console.log(`Fee: $${discountedFees.feeAmount.toFixed(2)} (${discountedFees.totalFeePercent}%)`);
  console.log(`Amount received: $${discountedFees.amountAfterFees.toFixed(2)}`);

  // In production:
  //
  // const result = await executeBaseWithdrawal(
  //   { senderWallet: '0x...', recipient: '0x...', amount: 200, token: 'USDC', nonce: 0 },
  //   {
  //     privacyPoolAddress: CONFIG.privacyPoolAddress,
  //     tokenAddress: CONFIG.usdcAddress,
  //     signer: intermediateWalletSigner,
  //     feeDiscount: 0.5,
  //   },
  // );

  console.log('\nWithdrawal flow:');
  console.log('  1. Upload proof (authorizes withdrawal amount)');
  console.log('  2. externalTransfer() — tokens leave pool to your wallet');
  console.log('  3. On-chain: observers see pool → recipient, not sender → recipient\n');
}

// ============================================================================
// Run Examples
// ============================================================================

async function main() {
  console.log('ORB402 — Private Transfer Examples\n');
  console.log('These examples demonstrate the ZK privacy transfer system.');
  console.log('Replace mock values with real contract addresses to use.\n');
  console.log('─'.repeat(60) + '\n');

  await exampleDeposit();
  await exampleTransfer();
  await exampleSplitTransfer();
  await exampleWithdrawal();

  console.log('─'.repeat(60));
  console.log('\nFor more information: https://github.com/ORB402/ORB402');
}

main().catch(console.error);
