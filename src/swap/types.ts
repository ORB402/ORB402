/**
 * ORB402 Swap Module — Type Definitions
 *
 * Types for the token swap system using Permit2 SignatureTransfer
 * and DEX aggregation on Base L2.
 */

import type { Address, Hash, Hex } from 'viem';

// ============================================================================
// Token Types
// ============================================================================

/** Token metadata for display and swap operations */
export interface TokenInfo {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  logoUrl: string;
}

// ============================================================================
// Swap Result Types
// ============================================================================

/** Result from a price indicative quote (no commitment) */
export interface SwapPriceResult {
  buyAmount: bigint;
  sellAmount: bigint;
  minBuyAmount: bigint;
  gas: bigint;
  gasPrice: bigint;
  totalNetworkFee: bigint;
  allowanceTarget: Address;
  liquidityAvailable: boolean;
  blockNumber: string;
}

/** Result from a firm quote (ready to execute) */
export interface SwapQuoteResult extends SwapPriceResult {
  /** Permit2 typed data for signature (EIP-712) */
  permit2?: {
    type: string;
    hash: string;
    eip712: any;
  };
  /** Transaction to send */
  transaction: {
    to: Address;
    data: Hex;
    gas: bigint;
    gasPrice: bigint;
    value: bigint;
  };
}

/** Final swap execution result */
export interface SwapResult {
  txHash: Hash;
  buyAmount: bigint;
  sellAmount: bigint;
}

// ============================================================================
// Swap Configuration
// ============================================================================

/** Fee configuration for the swap integrator */
export interface SwapFeeConfig {
  /** Recipient address for swap fees */
  recipient: Address;
  /** Fee in basis points (e.g., 50 = 0.5%) */
  bps: number;
}

/** Swap parameters */
export interface SwapParams {
  sellToken: Address;
  buyToken: Address;
  sellAmount: bigint;
  /** Slippage tolerance in basis points (default: 300 = 3%) */
  slippageBps?: number;
  /** Taker address (auto-detected from wallet if omitted) */
  taker?: Address;
}

/** State machine for swap UI */
export type SwapStep =
  | 'idle'
  | 'quoting'
  | 'quoted'
  | 'swapping'
  | 'success'
  | 'error';
