/**
 * ORB402 — ZK Privacy Transfer Types
 * Core type definitions for the privacy-preserving transfer system.
 */

// ============================================================================
// Privacy Levels
// ============================================================================

export type PrivacyLevel = 'public' | 'partial' | 'full';

// ============================================================================
// Transfer Types
// ============================================================================

export interface TransferParams {
  /** Sender's wallet address */
  senderWallet: string;
  /** Recipient's wallet address */
  recipientWallet: string;
  /** Amount in human-readable units (e.g. 10.50 for $10.50 USDC) */
  amount: number;
  /** Token symbol */
  token: 'USDC' | 'USDT';
  /** If true, always use external transfer (tokens leave the contract) */
  forceExternal?: boolean;
}

export interface TransferResult {
  success: boolean;
  /** Transaction hash / signature */
  txHash?: string;
  /** Error message if failed */
  error?: string;
}

// ============================================================================
// Deposit Types
// ============================================================================

export interface DepositParams {
  /** User's wallet address */
  wallet: string;
  /** Deposit amount */
  amount: number;
  /** Token to deposit */
  token: 'USDC' | 'USDT';
  /** Privacy level for this deposit */
  privacyLevel: PrivacyLevel;
}

export interface HoldingWalletResult {
  success: boolean;
  /** Generated holding wallet address */
  holdingWalletAddress?: string;
  /** Unique deposit identifier */
  depositId?: string;
  /** Serialized transaction for user to sign (Solana: base64, EVM: tx object) */
  transaction?: string | EvmTransaction;
  /** Whether ERC-20 approval is needed first (EVM only) */
  needsApproval?: boolean;
  /** Approval transaction object (EVM only) */
  approveTransaction?: EvmTransaction;
  error?: string;
}

export interface EvmTransaction {
  to: string;
  data: string;
  value: string;
}

// ============================================================================
// Proof Types
// ============================================================================

export interface ProofData {
  /** ZK proof bytes (hex-encoded) */
  proofBytes: string;
  /** Pedersen commitment bytes (hex-encoded) */
  commitmentBytes: string;
  /** Blinding factor bytes (hex-encoded) */
  blindingFactorBytes: string;
}

export interface ProofUploadResult {
  success: boolean;
  /** Transaction signature */
  signature?: string;
  /** Nonce used for this proof */
  nonce?: number;
  /** Proof PDA address (Solana) or proof ID (EVM) */
  proofId?: string;
  error?: string;
}

// ============================================================================
// Withdrawal Types
// ============================================================================

export interface WithdrawParams {
  /** Sender's wallet (who is withdrawing) */
  senderWallet: string;
  /** Recipient address (can be same as sender for self-withdrawal) */
  recipient: string;
  /** Amount to withdraw */
  amount: number;
  /** Token symbol */
  token: 'USDC' | 'USDT';
  /** Nonce for proof verification */
  nonce: number;
}

export interface WithdrawResult {
  success: boolean;
  /** Transaction hash */
  signature?: string;
  /** Original amount */
  amount?: number;
  /** Amount after fees */
  amountReceived?: number;
  /** Fee deducted */
  fee?: number;
  /** Fee percentage applied */
  feePercentage?: number;
  error?: string;
}

// ============================================================================
// Split / Mixing Types
// ============================================================================

export interface SplitSchedule {
  /** Split amounts in smallest token units */
  amounts: bigint[];
  /** Scheduled send times for each split */
  scheduledTimes: Date[];
}

// ============================================================================
// Chain Configuration
// ============================================================================

export type SupportedChain = 'base' | 'solana';

export interface ChainConfig {
  chain: SupportedChain;
  /** RPC endpoint URL */
  rpcUrl: string;
  /** Privacy pool contract address (EVM) or program ID (Solana) */
  privacyPoolAddress: string;
  /** USDC token address / mint */
  usdcAddress: string;
  /** USDT token address / mint */
  usdtAddress: string;
}
