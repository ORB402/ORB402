/**
 * ORB402 — Private Withdrawal
 *
 * Moves funds from the ORB402 privacy pool to an external wallet address.
 * The withdrawal hides the sender's identity — on-chain observers see tokens
 * moving from the pool contract, not from any specific user.
 *
 * Withdrawal Flow (2 steps):
 * ┌─────────────────────────────────────────────────────────┐
 * │ STEP 1: Upload ZK proof                                │
 * │   - Proves the sender has sufficient balance            │
 * │   - Creates on-chain proof account / stores proof data  │
 * ├─────────────────────────────────────────────────────────┤
 * │ STEP 2: Execute external transfer                      │
 * │   - Moves tokens from pool to recipient                │
 * │   - Deducts fees (withdrawal + pool maintenance)       │
 * │   - Consumes the proof (prevents replay)               │
 * └─────────────────────────────────────────────────────────┘
 *
 * Fee Structure:
 * - Withdrawal fee: 1.0% (covers relayer gas costs)
 * - Pool maintenance fee: 0.5% (funds pool operations)
 * - Total: 1.5% deducted from withdrawal amount
 *
 * The fee can be reduced based on token holder tiers (governance token).
 */

import { ethers } from 'ethers';
import {
  generatePrivacyNonce,
  getProofId,
  generateMockProof,
} from '../lib/privacy-utils';
import type { WithdrawParams, WithdrawResult } from '../types';

// ============================================================================
// Fee Calculation
// ============================================================================

/** Base withdrawal fee percentage */
const BASE_WITHDRAW_FEE = 1.0;

/** Pool maintenance fee percentage */
const POOL_FEE = 0.5;

/**
 * Calculate withdrawal fees.
 *
 * @param amount - Withdrawal amount
 * @param feeDiscount - Optional fee discount (0-1, from token holder tier)
 * @returns Fee breakdown
 */
export function calculateWithdrawalFees(
  amount: number,
  feeDiscount: number = 0,
): {
  totalFeePercent: number;
  feeAmount: number;
  amountAfterFees: number;
} {
  const withdrawFee = BASE_WITHDRAW_FEE * (1 - feeDiscount);
  const totalFeePercent = withdrawFee + POOL_FEE;
  const feeAmount = amount * (totalFeePercent / 100);
  const amountAfterFees = amount - feeAmount;

  return { totalFeePercent, feeAmount, amountAfterFees };
}

// ============================================================================
// Solana Withdrawal
// ============================================================================

/**
 * Instruction discriminator for external_transfer on the ORB402 Solana program.
 * (Same instruction used for both external transfers and withdrawals)
 */
const EXTERNAL_TRANSFER_DISCRIMINATOR = [11, 179, 85, 190, 61, 53, 105, 169];

/**
 * Build the external_transfer instruction data for a Solana withdrawal.
 *
 * The instruction is identical to an external transfer — withdrawals are
 * implemented as external transfers where the recipient is the user's own
 * external wallet.
 *
 * Required accounts (in order):
 * 1. sender (signer, writable) — intermediate wallet
 * 2. proof PDA (writable) — consumed after withdrawal
 * 3. sender_balance PDA (writable) — debited
 * 4. pool PDA (writable) — pool authority
 * 5. token_mint (read-only)
 * 6. pool_token_account (writable) — tokens come from here
 * 7. recipient_token_account (writable) — tokens go here
 * 8. token_program (read-only)
 *
 * @param relayerFee - Fee in lamports for the relayer
 * @returns Encoded instruction data
 */
export function buildWithdrawInstructionData(relayerFee: number = 0): Uint8Array {
  const feeBuffer = new ArrayBuffer(8);
  const feeView = new DataView(feeBuffer);
  const feeBigInt = BigInt(relayerFee);
  for (let i = 0; i < 8; i++) {
    feeView.setUint8(i, Number((feeBigInt >> BigInt(i * 8)) & 0xffn));
  }

  const discriminator = new Uint8Array(EXTERNAL_TRANSFER_DISCRIMINATOR);
  const result = new Uint8Array(16);
  result.set(discriminator, 0);
  result.set(new Uint8Array(feeBuffer), 8);

  return result;
}

// ============================================================================
// EVM Withdrawal (Base Chain)
// ============================================================================

/**
 * ABI for the ORB402PrivacyPool withdrawal functions.
 */
const PRIVACY_POOL_ABI = [
  'function uploadProof(uint256 nonce, uint256 amount, address token, bytes proof, bytes commitment, bytes blindingFactor)',
  'function externalTransfer(bytes32 proofId, address recipient, uint256 relayerFee)',
  'function getUserBalance(address user, address token) view returns (uint256 available, uint256 locked)',
];

/**
 * Execute a private withdrawal on Base chain.
 *
 * Performs the full 2-step withdrawal:
 * 1. Upload proof (authorizes the withdrawal amount)
 * 2. External transfer (moves tokens from pool to recipient)
 *
 * @param params - Withdrawal parameters
 * @param config - Contract and signer configuration
 * @returns Withdrawal result with transaction hash and fee breakdown
 */
export async function executeBaseWithdrawal(
  params: WithdrawParams,
  config: {
    privacyPoolAddress: string;
    tokenAddress: string;
    /** Intermediate wallet signer (has pool balance) */
    signer: ethers.Signer;
    /** Optional fee discount from token holder tier */
    feeDiscount?: number;
  },
): Promise<WithdrawResult> {
  try {
    const { senderWallet, recipient, amount, token } = params;
    const amountInUnits = ethers.parseUnits(amount.toString(), 6);

    const privacyPool = new ethers.Contract(
      config.privacyPoolAddress,
      PRIVACY_POOL_ABI,
      config.signer,
    );

    // Calculate fees
    const { totalFeePercent, feeAmount, amountAfterFees } = calculateWithdrawalFees(
      amount,
      config.feeDiscount || 0,
    );
    const relayerFeeInUnits = ethers.parseUnits(feeAmount.toString(), 6);

    // STEP 1: Generate nonce and upload proof
    const privacyNonce = generatePrivacyNonce(senderWallet);
    const proofId = getProofId(privacyNonce);
    const { proofBytes, commitmentBytes, blindingFactorBytes } = generateMockProof(
      senderWallet,
      amountInUnits,
      privacyNonce,
    );

    const uploadTx = await privacyPool.uploadProof(
      privacyNonce,
      amountInUnits,
      config.tokenAddress,
      proofBytes,
      commitmentBytes,
      blindingFactorBytes,
    );
    await uploadTx.wait();

    // STEP 2: Execute external transfer (withdrawal)
    const withdrawTx = await privacyPool.externalTransfer(
      proofId,
      recipient,
      relayerFeeInUnits,
    );
    const receipt = await withdrawTx.wait();

    return {
      success: true,
      signature: receipt.hash,
      amount,
      amountReceived: amountAfterFees,
      fee: feeAmount,
      feePercentage: totalFeePercent,
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Withdrawal failed' };
  }
}
