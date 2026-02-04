/**
 * ORB402 — Validation Utilities
 *
 * Input validation for transfer parameters, amounts, addresses, and proofs.
 * All public SDK methods should validate inputs before processing.
 */

import { TRANSFER_LIMITS, SUPPORTED_CHAINS } from '../constants';
import { isValidEvmAddress } from './encoding';
import type { TransferParams, DepositParams, WithdrawParams } from '../types';

// ============================================================================
// Amount Validation
// ============================================================================

/**
 * Validate a transfer amount.
 *
 * @param amount - Amount in USD
 * @throws If amount is out of bounds or invalid
 */
export function validateAmount(amount: number): void {
  if (typeof amount !== 'number' || isNaN(amount)) {
    throw new Error('ORB402: amount must be a valid number');
  }

  if (amount < TRANSFER_LIMITS.minAmount) {
    throw new Error(
      `ORB402: amount must be at least $${TRANSFER_LIMITS.minAmount}`,
    );
  }

  if (amount > TRANSFER_LIMITS.maxAmount) {
    throw new Error(
      `ORB402: amount cannot exceed $${TRANSFER_LIMITS.maxAmount.toLocaleString()}`,
    );
  }
}

/**
 * Validate a bigint amount in token units.
 *
 * @param amount - Amount in token units (6 decimals)
 * @throws If amount is below minimum
 */
export function validateTokenAmount(amount: bigint): void {
  if (amount <= 0n) {
    throw new Error('ORB402: token amount must be positive');
  }

  const minUnits = BigInt(TRANSFER_LIMITS.minAmount) * 1_000_000n;
  if (amount < minUnits) {
    throw new Error(
      `ORB402: token amount must be at least ${minUnits} units ($${TRANSFER_LIMITS.minAmount})`,
    );
  }
}

// ============================================================================
// Address Validation
// ============================================================================

/**
 * Validate a wallet address for the given chain.
 *
 * @param address - Wallet address
 * @param chain - Target chain
 * @throws If address is invalid for the chain
 */
export function validateAddress(address: string, chain: 'base' | 'solana'): void {
  if (!address || typeof address !== 'string') {
    throw new Error('ORB402: address is required');
  }

  if (chain === 'base') {
    if (!isValidEvmAddress(address)) {
      throw new Error(`ORB402: invalid Base address "${address}"`);
    }
  } else if (chain === 'solana') {
    // Solana addresses are base58-encoded, 32-44 characters
    if (address.length < 32 || address.length > 44) {
      throw new Error(`ORB402: invalid Solana address "${address}"`);
    }
    if (!/^[1-9A-HJ-NP-Za-km-z]+$/.test(address)) {
      throw new Error(`ORB402: invalid Solana address format "${address}"`);
    }
  }
}

// ============================================================================
// Parameter Validation
// ============================================================================

/**
 * Validate transfer parameters.
 *
 * @param params - Transfer parameters
 * @param chain - Target chain
 * @throws If any parameter is invalid
 */
export function validateTransferParams(
  params: TransferParams,
  chain: 'base' | 'solana' = 'base',
): void {
  validateAddress(params.senderWallet, chain);
  validateAddress(params.recipientWallet, chain);
  validateAmount(params.amount);

  if (params.senderWallet === params.recipientWallet) {
    throw new Error('ORB402: sender and recipient cannot be the same address');
  }

  if (params.token && !['USDC', 'USDT'].includes(params.token)) {
    throw new Error(`ORB402: unsupported token "${params.token}"`);
  }
}

/**
 * Validate deposit parameters.
 *
 * @param params - Deposit parameters
 * @throws If any parameter is invalid
 */
export function validateDepositParams(params: DepositParams): void {
  if (!params.wallet || typeof params.wallet !== 'string') {
    throw new Error('ORB402: wallet address is required');
  }
  validateAmount(params.amount);

  if (params.token && !['USDC', 'USDT'].includes(params.token)) {
    throw new Error(`ORB402: unsupported token "${params.token}"`);
  }
}

/**
 * Validate withdrawal parameters.
 *
 * @param params - Withdrawal parameters
 * @param chain - Target chain
 * @throws If any parameter is invalid
 */
export function validateWithdrawParams(
  params: WithdrawParams,
  chain: 'base' | 'solana' = 'base',
): void {
  validateAddress(params.senderWallet, chain);
  validateAddress(params.recipient, chain);
  validateAmount(params.amount);

  if (params.senderWallet === params.recipient) {
    throw new Error('ORB402: sender and recipient cannot be the same for withdrawal');
  }
}

// ============================================================================
// Chain Validation
// ============================================================================

/**
 * Validate that a chain is supported.
 *
 * @param chain - Chain identifier
 * @throws If chain is not supported
 */
export function validateChain(chain: string): asserts chain is 'base' | 'solana' {
  if (!SUPPORTED_CHAINS.includes(chain as any)) {
    throw new Error(
      `ORB402: unsupported chain "${chain}". Supported: ${SUPPORTED_CHAINS.join(', ')}`,
    );
  }
}
