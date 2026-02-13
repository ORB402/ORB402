/**
 * ORB402 — ZK Proof Upload
 *
 * Creates on-chain proof accounts that authorize transfers and withdrawals.
 * A proof must be uploaded before any funds can move within or out of the pool.
 *
 * The proof account stores:
 * - Nonce (unique identifier, prevents replay)
 * - Amount (the authorized transfer amount)
 * - Token mint (which token is being transferred)
 * - ZK proof bytes (verifiable on-chain)
 * - Commitment (Pedersen commitment to the amount)
 * - Blinding factor (for commitment verification)
 *
 * Architecture:
 * - Solana: Creates a PDA (Program Derived Address) account via the ORB402 program
 * - Base: Calls uploadProof() on the ORB402PrivacyPool smart contract
 *
 * The proof upload is the first step in both transfers and withdrawals.
 */

import { ethers } from 'ethers';
import {
  generatePrivacyNonce,
  getProofId,
  generateMockProof,
} from '../lib/privacy-utils';
import type { ProofUploadResult } from '../types';

// ============================================================================
// Solana Proof Upload (On-chain PDA)
// ============================================================================

/**
 * Instruction discriminator for upload_proof on the ORB402 Solana program.
 * This 8-byte prefix identifies the instruction type.
 */
const UPLOAD_PROOF_DISCRIMINATOR = [57, 235, 171, 213, 237, 91, 79, 2];

/**
 * Build the upload_proof instruction data for the Solana program.
 *
 * Instruction layout:
 * [0..8]   discriminator (8 bytes)
 * [8..16]  nonce (u64, little-endian)
 * [16..24] amount (u64, little-endian)
 * [24..28] proof_length (u32, little-endian)
 * [28..N]  proof_bytes (variable length)
 * [N..N+4] commitment_length (u32)
 * [N+4..M] commitment_bytes (variable)
 * [M..M+4] blinding_length (u32)
 * [M+4..] blinding_factor_bytes (variable)
 *
 * @param nonce - Unique nonce for this proof
 * @param amount - Amount in lamports (smallest units)
 * @param proofBytes - ZK proof data
 * @param commitmentBytes - Pedersen commitment
 * @param blindingFactorBytes - Blinding factor
 * @returns Encoded instruction data as Uint8Array
 */
export function buildUploadProofData(
  nonce: number,
  amount: number,
  proofBytes: Uint8Array,
  commitmentBytes: Uint8Array,
  blindingFactorBytes: Uint8Array,
): Uint8Array {
  // Encode nonce as u64 little-endian
  const nonceBuffer = new ArrayBuffer(8);
  const nonceView = new DataView(nonceBuffer);
  const nonceBigInt = BigInt(nonce);
  for (let i = 0; i < 8; i++) {
    nonceView.setUint8(i, Number((nonceBigInt >> BigInt(i * 8)) & 0xffn));
  }

  // Encode amount as u64 little-endian
  const amountBuffer = new ArrayBuffer(8);
  const amountView = new DataView(amountBuffer);
  const amountBigInt = BigInt(amount);
  for (let i = 0; i < 8; i++) {
    amountView.setUint8(i, Number((amountBigInt >> BigInt(i * 8)) & 0xffn));
  }

  // Encode Vec<u8> fields with 4-byte length prefix (little-endian)
  const proofLen = new Uint8Array(4);
  new DataView(proofLen.buffer).setUint32(0, proofBytes.length, true);

  const commitLen = new Uint8Array(4);
  new DataView(commitLen.buffer).setUint32(0, commitmentBytes.length, true);

  const blindingLen = new Uint8Array(4);
  new DataView(blindingLen.buffer).setUint32(0, blindingFactorBytes.length, true);

  // Concatenate all parts
  const discriminator = new Uint8Array(UPLOAD_PROOF_DISCRIMINATOR);
  const parts = [
    discriminator,
    new Uint8Array(nonceBuffer),
    new Uint8Array(amountBuffer),
    proofLen, proofBytes,
    commitLen, commitmentBytes,
    blindingLen, blindingFactorBytes,
  ];

  const totalLength = parts.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }

  return result;
}

/**
 * Solana account layout for the upload_proof instruction.
 *
 * The instruction requires these accounts in order:
 * 1. sender (signer, writable) — pays for proof account rent
 * 2. proof PDA (writable) — the proof account to create
 * 3. token_mint (read-only) — which token this proof is for
 * 4. system_program (read-only) — for account creation
 *
 * The proof PDA is derived as:
 *   PDA = findProgramAddress(["proof", nonce_bytes], PROGRAM_ID)
 */
export interface SolanaProofAccounts {
  /** Wallet paying for the proof account (signer) */
  sender: string;
  /** Derived proof PDA address */
  proofPda: string;
  /** Token mint address (USDC or USDT) */
  tokenMint: string;
  /** System Program ID */
  systemProgram: string;
}

// ============================================================================
// EVM Proof Upload (Base Chain)
// ============================================================================

/**
 * ABI for the ORB402PrivacyPool contract's uploadProof function.
 */
const PRIVACY_POOL_UPLOAD_ABI = [
  'function uploadProof(uint256 nonce, uint256 amount, address token, bytes proof, bytes commitment, bytes blindingFactor)',
  'function getProofId(uint256 nonce) view returns (bytes32)',
];

/**
 * Build an EVM proof upload transaction for Base chain.
 *
 * This calls ORB402PrivacyPool.uploadProof() which:
 * 1. Verifies the proof doesn't already exist (prevents replay)
 * 2. Stores the proof data on-chain
 * 3. Creates a proof ID (keccak256 of nonce) for later reference
 *
 * The proof must be uploaded by the intermediate wallet that holds
 * the pool balance (not the user's wallet directly).
 *
 * @param senderWallet - The sender's wallet address (for proof generation)
 * @param amount - Amount in human-readable units
 * @param tokenAddress - ERC-20 token address on Base
 * @param privacyPoolAddress - ORB402PrivacyPool contract address
 * @returns Transaction data and proof metadata
 */
export function buildEvmProofUpload(
  senderWallet: string,
  amount: number,
  tokenAddress: string,
  privacyPoolAddress: string,
): {
  nonce: bigint;
  proofId: string;
  transaction: { to: string; data: string };
} {
  const amountInUnits = ethers.parseUnits(amount.toString(), 6);
  const nonce = generatePrivacyNonce(senderWallet);
  const proofId = getProofId(nonce);

  const { proofBytes, commitmentBytes, blindingFactorBytes } = generateMockProof(
    senderWallet,
    amountInUnits,
    nonce,
  );

  const iface = new ethers.Interface(PRIVACY_POOL_UPLOAD_ABI);
  const data = iface.encodeFunctionData('uploadProof', [
    nonce,
    amountInUnits,
    tokenAddress,
    proofBytes,
    commitmentBytes,
    blindingFactorBytes,
  ]);

  return {
    nonce,
    proofId,
    transaction: {
      to: privacyPoolAddress,
      data,
    },
  };
}
