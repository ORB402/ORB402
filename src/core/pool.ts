/**
 * ORB402 — Privacy Pool Client
 *
 * Read-only client for querying the ORB402PrivacyPool contract state.
 * Provides methods to check balances, proof status, and pool statistics
 * without requiring a signer.
 */

import { ethers } from 'ethers';
import { EVM_CONTRACT } from '../constants';

// ============================================================================
// Types
// ============================================================================

export interface PoolBalance {
  /** Available balance (can be transferred or withdrawn) */
  available: bigint;
  /** Locked balance (reserved by active proofs) */
  locked: bigint;
  /** Total balance (available + locked) */
  total: bigint;
}

export interface ProofStatus {
  /** Proof sender address */
  sender: string;
  /** Proof amount in token units */
  amount: bigint;
  /** Token address */
  token: string;
  /** Whether the proof has been consumed */
  consumed: boolean;
  /** Whether the proof exists */
  exists: boolean;
}

// ============================================================================
// Pool Client
// ============================================================================

export class PoolClient {
  private contract: ethers.Contract;
  private provider: ethers.Provider;

  constructor(
    privacyPoolAddress: string,
    providerOrUrl: ethers.Provider | string,
  ) {
    this.provider = typeof providerOrUrl === 'string'
      ? new ethers.JsonRpcProvider(providerOrUrl)
      : providerOrUrl;

    this.contract = new ethers.Contract(
      privacyPoolAddress,
      EVM_CONTRACT.abi,
      this.provider,
    );
  }

  /**
   * Get a user's balance in the privacy pool.
   *
   * @param userAddress - User's wallet address
   * @param tokenAddress - Token contract address
   * @returns Balance breakdown (available, locked, total)
   */
  async getBalance(userAddress: string, tokenAddress: string): Promise<PoolBalance> {
    const [available, locked] = await this.contract.getUserBalance(userAddress, tokenAddress);
    return {
      available,
      locked,
      total: available + locked,
    };
  }

  /**
   * Check the status of a ZK proof.
   *
   * @param proofId - The proof identifier (keccak256 of the nonce)
   * @returns Proof details and consumption status
   */
  async getProofStatus(proofId: string): Promise<ProofStatus> {
    try {
      const [sender, amount, token, consumed] = await this.contract.getProof(proofId);
      return {
        sender,
        amount,
        token,
        consumed,
        exists: sender !== ethers.ZeroAddress,
      };
    } catch {
      return {
        sender: ethers.ZeroAddress,
        amount: 0n,
        token: ethers.ZeroAddress,
        consumed: false,
        exists: false,
      };
    }
  }

  /**
   * Check if a proof has been consumed (used for transfer/withdrawal).
   *
   * @param proofId - The proof identifier
   * @returns true if consumed, false otherwise
   */
  async isProofConsumed(proofId: string): Promise<boolean> {
    const status = await this.getProofStatus(proofId);
    return status.consumed;
  }

  /**
   * Get the contract address.
   */
  get address(): string {
    return this.contract.target as string;
  }
}
