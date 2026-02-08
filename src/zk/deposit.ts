/**
 * ORB402 — Private Deposit Flow
 *
 * Creates a deposit transaction that moves user funds into the ORB402 privacy pool.
 * Supports both Solana (SPL token transfer) and Base (EVM approve + deposit).
 *
 * Deposit Architecture:
 * 1. User requests a deposit → backend creates a unique holding wallet
 * 2. User signs a transaction sending tokens to the holding wallet
 * 3. Backend detects the deposit and moves funds into the privacy pool
 * 4. User's balance is credited in the pool (on-chain, with ZK proofs)
 *
 * The holding wallet is deterministic (derived from deposit ID) so it can be
 * reconstructed without storing private keys in the database.
 *
 * Privacy levels:
 * - "public": Direct deposit, no mixing (fastest)
 * - "partial": Single-hop through intermediate wallet
 * - "full": Multi-hop with amount splitting and time delays
 */

import { ethers } from 'ethers';
import type { DepositParams, HoldingWalletResult, EvmTransaction } from '../types';

// ============================================================================
// Holding Wallet Generation
// ============================================================================

/**
 * Generate a deterministic EVM holding wallet from a deposit ID.
 *
 * The wallet is derived via keccak256 hash of the deposit ID, ensuring:
 * - Same deposit ID always produces the same wallet
 * - Wallet can be reconstructed without storing the private key
 * - Each deposit gets a unique, isolated wallet
 *
 * @param depositId - Unique deposit identifier (e.g., "0xabc..._1706000000_USDC")
 * @returns Ethers Wallet instance for the holding wallet
 */
export function generateHoldingWallet(depositId: string): ethers.Wallet {
  const seed = ethers.keccak256(ethers.toUtf8Bytes(depositId));
  return new ethers.Wallet(seed);
}

/**
 * Generate a unique deposit ID from wallet, timestamp, and token.
 *
 * @param wallet - User's wallet address
 * @param token - Token symbol
 * @returns Unique deposit identifier string
 */
export function generateDepositId(wallet: string, token: string): string {
  return `${wallet}_${Date.now()}_${token}`;
}

// ============================================================================
// EVM Deposit (Base Chain)
// ============================================================================

/**
 * Standard ERC-20 ABI subset needed for deposits.
 */
const ERC20_ABI = [
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address owner) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
];

/**
 * DepositRouter ABI — the router handles approve + deposit in a single flow.
 * The router atomically:
 * 1. Transfers tokens from user to holding wallet
 * 2. Forwards ETH to collection wallet for backend gas funding
 */
const DEPOSIT_ROUTER_ABI = [
  'function depositWithGas(address token, address holdingWallet, uint256 amount) payable',
];

/**
 * Build EVM deposit transactions for Base chain.
 *
 * Returns one or two transactions:
 * 1. (Optional) ERC-20 approval if the router doesn't have sufficient allowance
 * 2. DepositRouter.depositWithGas() — transfers tokens + forwards ETH for gas
 *
 * The user signs these transactions in their wallet (MetaMask, Phantom, etc.)
 *
 * @param params - Deposit parameters
 * @param config - Chain configuration (token addresses, router address)
 * @returns Holding wallet result with transaction(s) to sign
 */
export function buildEvmDeposit(
  params: DepositParams,
  config: {
    tokenAddress: string;
    routerAddress: string;
    privacyLevel: string;
  }
): {
  holdingWalletAddress: string;
  depositId: string;
  needsApproval: boolean;
  approveTransaction?: EvmTransaction;
  depositTransaction: EvmTransaction;
} {
  const depositId = generateDepositId(params.wallet, params.token);
  const holdingWallet = generateHoldingWallet(depositId);
  const holdingAddress = holdingWallet.address;

  const transferAmount = ethers.parseUnits(params.amount.toString(), 6); // USDC/USDT = 6 decimals

  // Build deposit transaction via router
  const routerInterface = new ethers.Interface(DEPOSIT_ROUTER_ABI);
  const depositData = routerInterface.encodeFunctionData('depositWithGas', [
    config.tokenAddress,
    holdingAddress,
    transferAmount,
  ]);

  // ETH forwarded to collection wallet for backend gas funding
  // Base gas is very cheap (~$0.01/tx), so minimal ETH needed
  const ethForGas = config.privacyLevel === 'public'
    ? ethers.parseEther('0.00015')   // holding wallet gas only
    : ethers.parseEther('0.0003');   // holding + intermediate wallet gas

  const depositTransaction: EvmTransaction = {
    to: config.routerAddress,
    data: depositData,
    value: '0x' + ethForGas.toString(16),
  };

  // Build approval transaction (user may need to approve router first)
  const erc20Interface = new ethers.Interface(ERC20_ABI);
  const approveData = erc20Interface.encodeFunctionData('approve', [
    config.routerAddress,
    transferAmount,
  ]);

  const approveTransaction: EvmTransaction = {
    to: config.tokenAddress,
    data: approveData,
    value: '0x0',
  };

  return {
    holdingWalletAddress: holdingAddress,
    depositId,
    needsApproval: true, // Caller should check on-chain allowance to determine
    approveTransaction,
    depositTransaction,
  };
}

// ============================================================================
// Solana Deposit (SPL Token Transfer)
// ============================================================================

/**
 * Build a Solana deposit instruction set.
 *
 * The Solana deposit flow:
 * 1. Create Associated Token Account (ATA) for holding wallet if needed
 * 2. SPL Token transfer from user's ATA to holding wallet's ATA
 *
 * The transaction is serialized to base64 for the frontend to deserialize,
 * have the user sign it, and submit to the network.
 *
 * @param params - Deposit parameters
 * @returns Instructions for building the Solana transaction
 */
export function buildSolanaDepositInstructions(params: DepositParams): {
  depositId: string;
  holdingWalletAddress: string;
  amountLamports: bigint;
  tokenMint: string;
} {
  const depositId = generateDepositId(params.wallet, params.token);

  // On Solana, holding wallet is derived from SHA-256 of the deposit ID
  // using the first 32 bytes as the keypair seed
  // (actual Keypair generation requires @solana/web3.js)

  const amountLamports = BigInt(Math.floor(params.amount * 1_000_000));

  // Well-known token mints on Solana mainnet
  const tokenMint = params.token === 'USDC'
    ? 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'  // USDC
    : 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB';  // USDT

  return {
    depositId,
    holdingWalletAddress: '(derived from depositId seed)',
    amountLamports,
    tokenMint,
  };
}
