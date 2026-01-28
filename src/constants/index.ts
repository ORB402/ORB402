/**
 * ORB402 — Constants
 *
 * Chain configurations, privacy levels, fee tiers, and contract addresses
 * for the ORB402 privacy transfer system.
 */

// ============================================================================
// Supported Chains
// ============================================================================

export const SUPPORTED_CHAINS = ['base', 'solana'] as const;
export type SupportedChain = (typeof SUPPORTED_CHAINS)[number];

// ============================================================================
// Base Chain Configuration
// ============================================================================

export const BASE_CHAIN_CONFIG = {
  chainId: 8453,
  name: 'Base',
  rpcUrl: 'https://mainnet.base.org',
  blockExplorer: 'https://basescan.org',
  tokens: {
    USDC: {
      address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
      decimals: 6,
      symbol: 'USDC',
    },
    USDT: {
      address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
      decimals: 6,
      symbol: 'USDT',
    },
  },
} as const;

// ============================================================================
// Solana Configuration
// ============================================================================

export const SOLANA_CONFIG = {
  name: 'Solana',
  rpcUrl: 'https://api.mainnet-beta.solana.com',
  blockExplorer: 'https://solscan.io',
  tokens: {
    USDC: {
      mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v',
      decimals: 6,
      symbol: 'USDC',
    },
    USDT: {
      mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB',
      decimals: 6,
      symbol: 'USDT',
    },
  },
} as const;

// ============================================================================
// Privacy Levels
// ============================================================================

/**
 * Privacy level definitions.
 *
 * - `standard`: Single transfer, no obfuscation. Fastest but least private.
 * - `enhanced`: Amount obfuscation + random delay. Good balance.
 * - `full`: Split transfers + obfuscation + random delays. Maximum privacy.
 */
export const PRIVACY_LEVELS = {
  standard: {
    label: 'Standard',
    obfuscation: false,
    splitting: false,
    delayRange: [0, 0] as [number, number],
  },
  enhanced: {
    label: 'Enhanced',
    obfuscation: true,
    splitting: false,
    delayRange: [5_000, 30_000] as [number, number],
  },
  full: {
    label: 'Full',
    obfuscation: true,
    splitting: true,
    delayRange: [10_000, 120_000] as [number, number],
  },
} as const;

export type PrivacyLevelKey = keyof typeof PRIVACY_LEVELS;

// ============================================================================
// Fee Tiers
// ============================================================================

/**
 * Fee tiers based on governance token holdings.
 *
 * Holding more ORB tokens grants reduced withdrawal fees.
 * The discount applies to the withdrawal fee only, not the pool maintenance fee.
 */
export const FEE_TIERS = {
  none: { minTokens: 0, discount: 0, label: 'No Discount' },
  bronze: { minTokens: 100, discount: 0.1, label: 'Bronze (10% off)' },
  silver: { minTokens: 1_000, discount: 0.25, label: 'Silver (25% off)' },
  gold: { minTokens: 10_000, discount: 0.5, label: 'Gold (50% off)' },
  platinum: { minTokens: 100_000, discount: 0.75, label: 'Platinum (75% off)' },
} as const;

export type FeeTier = keyof typeof FEE_TIERS;

// ============================================================================
// Transfer Limits
// ============================================================================

export const TRANSFER_LIMITS = {
  /** Minimum transfer amount in USD */
  minAmount: 1,
  /** Maximum single transfer amount in USD */
  maxAmount: 100_000,
  /** Maximum number of splits for full privacy mode */
  maxSplits: 4,
  /** Minimum split amount in token units (6 decimals) */
  minSplitAmount: 10_000_000n, // $10
} as const;

// ============================================================================
// Proof Constants
// ============================================================================

export const PROOF_CONSTANTS = {
  /** Size of privacy nonce in bytes */
  nonceSize: 32,
  /** Size of ZK proof in bytes */
  proofSize: 256,
  /** Size of Pedersen commitment in bytes */
  commitmentSize: 32,
  /** Size of blinding factor in bytes */
  blindingFactorSize: 32,
  /** Maximum proof validity period (seconds) */
  proofTTL: 300,
} as const;

// ============================================================================
// Solana Program Constants
// ============================================================================

export const SOLANA_PROGRAM = {
  /** Instruction discriminators for the ORB402 Solana program */
  discriminators: {
    uploadProof: [45, 22, 167, 88, 213, 34, 178, 99],
    internalTransfer: [174, 64, 12, 197, 38, 87, 205, 23],
    externalTransfer: [11, 179, 85, 190, 61, 53, 105, 169],
  },
  /** PDA seed prefixes */
  seeds: {
    proof: 'proof',
    pool: 'pool',
    userBalance: 'user_balance',
    holdingWallet: 'holding',
  },
} as const;

// ============================================================================
// EVM Contract Constants
// ============================================================================

export const EVM_CONTRACT = {
  /** ABI fragments for the ORB402PrivacyPool contract */
  abi: [
    'function uploadProof(uint256 nonce, uint256 amount, address token, bytes proof, bytes commitment, bytes blindingFactor)',
    'function internalTransfer(bytes32 proofId, address recipient)',
    'function externalTransfer(bytes32 proofId, address recipient, uint256 relayerFee)',
    'function getUserBalance(address user, address token) view returns (uint256 available, uint256 locked)',
    'function getProof(bytes32 proofId) view returns (address sender, uint256 amount, address token, bool consumed)',
    'function depositWithGas(address user, address token, uint256 amount) payable',
    'event ProofUploaded(bytes32 indexed proofId, address indexed sender, uint256 amount)',
    'event TransferExecuted(bytes32 indexed proofId, address indexed recipient, uint256 amount, bool internal)',
  ],
} as const;
