/**
 * ORB402 Privacy SDK
 *
 * Zero-knowledge privacy transfer system for Base (EVM) and Solana.
 * Provides private transfers, deposits, withdrawals, and proof management.
 *
 * @packageDocumentation
 */

// Core privacy primitives
export {
  generatePrivacyNonce,
  getProofId,
  obfuscateAmountForPrivacy,
  calculateSplits,
  calculateSplitSchedule,
  calculateRelayerDelay,
  generateMockProof,
} from './lib/privacy-utils';

// Deposit flow
export {
  generateHoldingWallet,
  generateDepositId,
  buildEvmDeposit,
} from './zk/deposit';

// Proof upload
export {
  buildUploadProofData,
  buildEvmProofUpload,
} from './zk/upload-proof';

// Private transfers
export {
  buildInternalTransferData,
  buildExternalTransferData,
  executeBaseTransfer,
} from './zk/transfer';

// Withdrawals
export {
  calculateWithdrawalFees,
  buildWithdrawInstructionData,
  executeBaseWithdrawal,
} from './zk/withdraw';

// Constants
export {
  SUPPORTED_CHAINS,
  BASE_CHAIN_CONFIG,
  PRIVACY_LEVELS,
  FEE_TIERS,
} from './constants';

// Configuration
export { createConfig, validateConfig } from './core/config';

// Token Swap (Permit2 + DEX aggregation)
export { ORB402Swapper } from './swap/swapper';
export { parseTokenAmount, formatTokenAmount } from './swap/utils';
export { BASE_TOKENS, NATIVE_TOKEN_ADDRESS, PERMIT2_ADDRESS } from './swap/constants';

// Types
export type {
  TransferParams,
  TransferResult,
  DepositParams,
  HoldingWalletResult,
  ProofData,
  WithdrawParams,
  WithdrawResult,
  SplitSchedule,
  ChainConfig,
  PrivacyLevel,
} from './types';

export type {
  TokenInfo,
  SwapPriceResult,
  SwapQuoteResult,
  SwapResult,
  SwapFeeConfig,
  SwapParams,
  SwapStep,
} from './swap/types';
