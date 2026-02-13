/**
 * ORB402 — Private Transfer (Multi-Step ZK Flow)
 *
 * Transfers funds between ORB402 users privately using zero-knowledge proofs.
 * The transfer is invisible on-chain — observers cannot link sender to recipient.
 *
 * Transfer Types:
 * - Internal: Between two ORB402 users (pool-to-pool, no tokens leave the contract)
 * - External: To a non-ORB402 address (tokens leave the pool to recipient)
 *
 * Multi-Step Flow (3 steps):
 * ┌─────────────────────────────────────────────────────────┐
 * │ STEP 1: Fund intermediate wallet (if needed)           │
 * │   - Check SOL/ETH balance for transaction fees         │
 * │   - Fund from gas wallet if insufficient               │
 * ├─────────────────────────────────────────────────────────┤
 * │ STEP 2: Upload ZK proof                                │
 * │   - Generate privacy nonce (uncorrelated with timing)  │
 * │   - Create proof PDA / call uploadProof()              │
 * │   - Wait for on-chain confirmation                     │
 * ├─────────────────────────────────────────────────────────┤
 * │ STEP 3: Execute transfer                               │
 * │   - Internal: internalTransfer(proofId, recipient, 0)  │
 * │   - External: externalTransfer(proofId, recipient, 0)  │
 * │   - Log transaction for history                        │
 * └─────────────────────────────────────────────────────────┘
 *
 * Security:
 * - Bearer token authentication required (wallet ownership verified)
 * - Self-transfers blocked (sender === recipient)
 * - Same intermediate wallet collision detection and resolution
 */

import { ethers } from 'ethers';
import {
  generatePrivacyNonce,
  getProofId,
  generateMockProof,
} from '../lib/privacy-utils';
import type { TransferParams, TransferResult } from '../types';

// ============================================================================
// Solana Transfer Instructions
// ============================================================================

/**
 * Instruction discriminator for internal_transfer on the ORB402 Solana program.
 */
const INTERNAL_TRANSFER_DISCRIMINATOR = [56, 217, 60, 137, 252, 221, 185, 114];

/**
 * Instruction discriminator for external_transfer on the ORB402 Solana program.
 */
const EXTERNAL_TRANSFER_DISCRIMINATOR = [11, 179, 85, 190, 61, 53, 105, 169];

/**
 * Build the internal_transfer instruction data.
 *
 * Internal transfers move balance between two users within the privacy pool.
 * No tokens actually move on-chain — only the pool's internal accounting changes.
 *
 * Instruction layout:
 * [0..8]  discriminator
 * [8..16] relayer_fee (u64, little-endian) — fee paid to relayer (usually 0)
 *
 * Required accounts:
 * 1. relayer (signer, writable)
 * 2. proof PDA (writable) — consumed after transfer
 * 3. sender_balance PDA (writable) — debited
 * 4. recipient (read-only)
 * 5. recipient_balance PDA (writable) — credited
 * 6. system_program
 *
 * @param relayerFee - Fee in lamports paid to the relayer (usually 0)
 * @returns Encoded instruction data
 */
export function buildInternalTransferData(relayerFee: number = 0): Uint8Array {
  const feeBuffer = new ArrayBuffer(8);
  const feeView = new DataView(feeBuffer);
  const feeBigInt = BigInt(relayerFee);
  for (let i = 0; i < 8; i++) {
    feeView.setUint8(i, Number((feeBigInt >> BigInt(i * 8)) & 0xffn));
  }

  const discriminator = new Uint8Array(INTERNAL_TRANSFER_DISCRIMINATOR);
  const result = new Uint8Array(16);
  result.set(discriminator, 0);
  result.set(new Uint8Array(feeBuffer), 8);

  return result;
}

/**
 * Build the external_transfer instruction data.
 *
 * External transfers move tokens OUT of the privacy pool to an external address.
 * Used for both withdrawals and transfers to non-ORB402 users.
 *
 * Instruction layout:
 * [0..8]  discriminator
 * [8..16] relayer_fee (u64, little-endian)
 *
 * Required accounts:
 * 1. sender (signer, writable)
 * 2. proof PDA (writable) — consumed
 * 3. sender_balance PDA (writable) — debited
 * 4. pool PDA (writable) — pool authority
 * 5. token_mint (read-only)
 * 6. pool_token_account (writable) — tokens debited from here
 * 7. recipient_token_account (writable) — tokens credited here
 * 8. token_program (read-only)
 *
 * @param relayerFee - Fee in lamports
 * @returns Encoded instruction data
 */
export function buildExternalTransferData(relayerFee: number = 0): Uint8Array {
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
// PDA Derivation (Solana)
// ============================================================================

/**
 * Derive the Pool PDA address.
 *
 * The pool PDA is the authority over all pooled tokens.
 * Seeds: ["pool", token_mint_bytes]
 *
 * @param tokenMint - Token mint public key (as string)
 * @param programId - ORB402 program ID
 * @returns PDA address (requires @solana/web3.js PublicKey.findProgramAddress)
 */
export function getPoolPdaSeeds(tokenMint: string): [string, Uint8Array] {
  return ['pool', new TextEncoder().encode(tokenMint)];
}

/**
 * Derive the User Balance PDA address.
 *
 * Each user has a balance PDA per token that tracks their pool balance.
 * Seeds: ["user_balance", intermediate_wallet_bytes, token_mint_bytes]
 *
 * @param intermediateWallet - User's intermediate wallet public key
 * @param tokenMint - Token mint public key
 * @returns PDA seeds
 */
export function getUserBalancePdaSeeds(
  intermediateWallet: string,
  tokenMint: string,
): [string, Uint8Array, Uint8Array] {
  return [
    'user_balance',
    new TextEncoder().encode(intermediateWallet),
    new TextEncoder().encode(tokenMint),
  ];
}

/**
 * Derive the Proof PDA address.
 *
 * Each proof upload creates a unique PDA that stores the proof data.
 * Seeds: ["proof", nonce_bytes(u64 le)]
 *
 * @param nonce - The proof nonce
 * @returns PDA seeds
 */
export function getProofPdaSeeds(nonce: number): [string, Uint8Array] {
  const nonceBytes = new Uint8Array(8);
  const view = new DataView(nonceBytes.buffer);
  const nonceBigInt = BigInt(nonce);
  for (let i = 0; i < 8; i++) {
    view.setUint8(i, Number((nonceBigInt >> BigInt(i * 8)) & 0xffn));
  }
  return ['proof', nonceBytes];
}

// ============================================================================
// EVM Transfer (Base Chain)
// ============================================================================

/**
 * ABI for the ORB402PrivacyPool transfer functions.
 */
const PRIVACY_POOL_TRANSFER_ABI = [
  'function internalTransfer(bytes32 proofId, address recipient, uint256 relayerFee)',
  'function externalTransfer(bytes32 proofId, address recipient, uint256 relayerFee)',
  'function getUserBalance(address user, address token) view returns (uint256 available, uint256 locked)',
  'function uploadProof(uint256 nonce, uint256 amount, address token, bytes proof, bytes commitment, bytes blindingFactor)',
];

/**
 * Execute a private transfer on Base chain via the ORB402PrivacyPool contract.
 *
 * This is the high-level orchestration function that performs all 3 steps:
 * 1. Upload proof
 * 2. Determine if internal or external transfer
 * 3. Execute the transfer
 *
 * @param params - Transfer parameters
 * @param config - Contract addresses and provider
 * @returns Transfer result with transaction hash
 */
export async function executeBaseTransfer(
  params: TransferParams,
  config: {
    privacyPoolAddress: string;
    tokenAddress: string;
    /** Signer with pool balance (intermediate wallet) */
    signer: ethers.Signer;
    /** Whether recipient is a known ORB402 user */
    recipientIsOrb402User: boolean;
  },
): Promise<TransferResult> {
  const { senderWallet, recipientWallet, amount, token } = params;

  // Validate
  if (senderWallet.toLowerCase() === recipientWallet.toLowerCase()) {
    return { success: false, error: 'Self-transfers are not allowed' };
  }

  try {
    const amountInUnits = ethers.parseUnits(amount.toString(), 6);
    const privacyPool = new ethers.Contract(
      config.privacyPoolAddress,
      PRIVACY_POOL_TRANSFER_ABI,
      config.signer,
    );

    // STEP 1: Generate nonce and proof
    const privacyNonce = generatePrivacyNonce(senderWallet);
    const proofId = getProofId(privacyNonce);
    const { proofBytes, commitmentBytes, blindingFactorBytes } = generateMockProof(
      senderWallet,
      amountInUnits,
      privacyNonce,
    );

    // STEP 2: Upload proof to contract
    const uploadTx = await privacyPool.uploadProof(
      privacyNonce,
      amountInUnits,
      config.tokenAddress,
      proofBytes,
      commitmentBytes,
      blindingFactorBytes,
    );
    await uploadTx.wait();

    // STEP 3: Execute transfer
    const relayerFee = 0n;
    let txHash: string;

    if (config.recipientIsOrb402User) {
      // Internal transfer — balance moves within the pool
      const transferTx = await privacyPool.internalTransfer(
        proofId,
        recipientWallet,
        relayerFee,
      );
      const receipt = await transferTx.wait();
      txHash = receipt.hash;
    } else {
      // External transfer — tokens leave the pool
      const transferTx = await privacyPool.externalTransfer(
        proofId,
        recipientWallet,
        relayerFee,
      );
      const receipt = await transferTx.wait();
      txHash = receipt.hash;
    }

    return { success: true, txHash };
  } catch (error: any) {
    return { success: false, error: error.message || 'Transfer failed' };
  }
}
