/**
 * ORB402 Swap Module — Swapper
 *
 * Token swap execution using Permit2 SignatureTransfer pattern:
 *
 *   1. ERC20.approve(Permit2, MAX_UINT256)  — one-time per token
 *   2. Get firm quote from DEX aggregator   — includes EIP-712 typed data
 *   3. Sign permit2.eip712 via wallet       — gasless token approval
 *   4. Append signature to calldata         — ABI-encoded bytes
 *   5. Send the swap transaction            — single atomic tx
 *
 * This pattern avoids the traditional approve-then-swap two-transaction
 * flow after the initial one-time Permit2 approval.
 *
 * Compatible with any 0x-style DEX aggregator API.
 */

import {
  createPublicClient,
  http,
  erc20Abi,
  encodeFunctionData,
  maxUint256,
  type Address,
  type Hash,
  type Hex,
  type PublicClient,
} from 'viem';
import { base } from 'viem/chains';
import { PERMIT2_ADDRESS, BASE_CHAIN_ID, isNativeToken } from './constants';
import type {
  SwapPriceResult,
  SwapQuoteResult,
  SwapResult,
  SwapFeeConfig,
  SwapParams,
} from './types';

// ============================================================================
// Response Parsers
// ============================================================================

function parsePriceResponse(raw: any): SwapPriceResult {
  return {
    buyAmount: BigInt(raw.buyAmount),
    sellAmount: BigInt(raw.sellAmount),
    minBuyAmount: BigInt(raw.minBuyAmount),
    gas: BigInt(raw.gas || raw.transaction?.gas || '0'),
    gasPrice: BigInt(raw.gasPrice || raw.transaction?.gasPrice || '0'),
    totalNetworkFee: BigInt(raw.totalNetworkFee || '0'),
    allowanceTarget: raw.allowanceTarget,
    liquidityAvailable: raw.liquidityAvailable ?? true,
    blockNumber: raw.blockNumber ?? '0',
  };
}

function parseQuoteResponse(raw: any): SwapQuoteResult {
  const priceData = parsePriceResponse(raw);
  const tx = raw.transaction;
  return {
    ...priceData,
    permit2: raw.permit2 || undefined,
    transaction: {
      to: tx.to,
      data: tx.data,
      gas: BigInt(tx.gas || '0'),
      gasPrice: BigInt(tx.gasPrice || '0'),
      value: BigInt(tx.value || '0'),
    },
  };
}

// ============================================================================
// Swapper Class
// ============================================================================

export class ORB402Swapper {
  private provider: any;
  private publicClient: PublicClient;
  private apiBaseUrl: string;
  private feeConfig?: SwapFeeConfig;

  /**
   * @param provider  — EIP-1193 wallet provider (e.g., window.ethereum)
   * @param apiBaseUrl — Base URL for the swap API proxy (e.g., "/api/swap")
   * @param feeConfig — Optional integrator fee configuration
   */
  constructor(provider: any, apiBaseUrl: string, feeConfig?: SwapFeeConfig) {
    this.provider = provider;
    this.apiBaseUrl = apiBaseUrl;
    this.feeConfig = feeConfig;
    this.publicClient = createPublicClient({
      chain: base,
      transport: http(),
    });
  }

  /** Get the connected wallet address */
  async getTakerAddress(): Promise<Address> {
    const accounts = await this.provider.request({ method: 'eth_accounts' });
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please connect your wallet.');
    }
    return accounts[0] as Address;
  }

  /** Fetch on-chain token balance */
  async getBalance(token: Address, owner: Address): Promise<bigint> {
    if (isNativeToken(token)) {
      return this.publicClient.getBalance({ address: owner });
    }
    return this.publicClient.readContract({
      address: token,
      abi: erc20Abi,
      functionName: 'balanceOf',
      args: [owner],
    });
  }

  // --------------------------------------------------------------------------
  // API Requests
  // --------------------------------------------------------------------------

  private buildQuery(params: Record<string, string | undefined>): string {
    const entries = Object.entries(params).filter(
      (e): e is [string, string] => e[1] !== undefined
    );
    return new URLSearchParams(entries).toString();
  }

  private async apiRequest(path: string): Promise<any> {
    const url = `${this.apiBaseUrl}${path}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
      let msg: string;
      try {
        const body = await response.json();
        msg = body.error || body.reason || JSON.stringify(body);
      } catch {
        msg = `HTTP ${response.status}: ${response.statusText}`;
      }
      throw new Error(`Swap API error: ${msg}`);
    }

    return response.json();
  }

  private buildSwapQuery(params: SwapParams, includeTaker: boolean): string {
    return this.buildQuery({
      chainId: BASE_CHAIN_ID.toString(),
      sellToken: params.sellToken,
      buyToken: params.buyToken,
      sellAmount: params.sellAmount.toString(),
      slippageBps: (params.slippageBps ?? 300).toString(),
      taker: includeTaker ? params.taker : undefined,
      // Integrator fee (optional)
      swapFeeRecipient: this.feeConfig?.recipient,
      swapFeeBps: this.feeConfig?.bps.toString(),
    });
  }

  // --------------------------------------------------------------------------
  // Price & Quote
  // --------------------------------------------------------------------------

  /** Get indicative price (no commitment, no taker required) */
  async getPrice(params: SwapParams): Promise<SwapPriceResult> {
    const query = this.buildSwapQuery(params, false);
    const raw = await this.apiRequest(`/price?${query}`);
    return parsePriceResponse(raw);
  }

  /** Get firm quote (ready to execute, taker required) */
  async getQuote(params: SwapParams): Promise<SwapQuoteResult> {
    const taker = params.taker ?? (await this.getTakerAddress());
    const query = this.buildSwapQuery({ ...params, taker }, true);
    const raw = await this.apiRequest(`/quote?${query}`);
    return parseQuoteResponse(raw);
  }

  // --------------------------------------------------------------------------
  // Transaction Helpers
  // --------------------------------------------------------------------------

  /** Wait for a transaction to be confirmed on-chain */
  private async waitForTx(hash: string, maxAttempts = 30): Promise<void> {
    for (let i = 0; i < maxAttempts; i++) {
      await new Promise((r) => setTimeout(r, 2000));
      const receipt = await this.provider.request({
        method: 'eth_getTransactionReceipt',
        params: [hash],
      });
      if (receipt && receipt.status === '0x1') return;
      if (receipt && receipt.status === '0x0') {
        throw new Error('Transaction failed');
      }
    }
    throw new Error('Transaction confirmation timed out');
  }

  // --------------------------------------------------------------------------
  // Swap Execution
  // --------------------------------------------------------------------------

  /**
   * Execute a full swap using Permit2 SignatureTransfer.
   *
   * Flow:
   *   1. Ensure ERC20.approve(Permit2) — one-time per token
   *   2. Get fresh firm quote with EIP-712 typed data
   *   3. Sign the permit2 typed data via eth_signTypedData_v4
   *   4. Append ABI-encoded signature to transaction calldata
   *   5. Send the swap transaction and wait for confirmation
   */
  async swap(params: SwapParams): Promise<SwapResult> {
    const taker = await this.getTakerAddress();

    // Step 1: For ERC-20 sells, ensure Permit2 has token approval
    if (!isNativeToken(params.sellToken)) {
      const allowance = await this.publicClient.readContract({
        address: params.sellToken,
        abi: erc20Abi,
        functionName: 'allowance',
        args: [taker, PERMIT2_ADDRESS],
      });

      if (allowance < params.sellAmount) {
        const approveData = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [PERMIT2_ADDRESS, maxUint256],
        });

        const approveHash = await this.provider.request({
          method: 'eth_sendTransaction',
          params: [{ from: taker, to: params.sellToken, data: approveData }],
        });

        await this.waitForTx(approveHash);
      }
    }

    // Step 2: Get FRESH quote (must be close to execution time)
    const quote = await this.getQuote({ ...params, taker });

    if (!quote.liquidityAvailable) {
      throw new Error('Insufficient liquidity available for this swap');
    }

    // Step 3: Build final transaction data with Permit2 signature
    let txData: Hex = quote.transaction.data;

    if (quote.permit2 && quote.permit2.eip712) {
      // Sign the Permit2 EIP-712 typed data
      const signature: string = await this.provider.request({
        method: 'eth_signTypedData_v4',
        params: [taker, JSON.stringify(quote.permit2.eip712)],
      });

      // Append signature as ABI-encoded bytes to calldata:
      //   uint256(length) + signature padded to 32-byte boundary
      const sigWithout0x = signature.startsWith('0x')
        ? signature.slice(2)
        : signature;
      const sigByteLength = sigWithout0x.length / 2;

      const lengthHex = sigByteLength.toString(16).padStart(64, '0');
      const paddedSig = sigWithout0x.padEnd(
        Math.ceil(sigByteLength / 32) * 64,
        '0'
      );

      txData = (quote.transaction.data + lengthHex + paddedSig) as Hex;
    }

    // Step 4: Send swap transaction with gas headroom
    const tx = quote.transaction;
    const gasLimit = tx.gas > 0n ? (tx.gas * 3n) / 2n : 500000n;
    const txHash: Hash = await this.provider.request({
      method: 'eth_sendTransaction',
      params: [
        {
          from: taker,
          to: tx.to,
          data: txData,
          gas: `0x${gasLimit.toString(16)}`,
          value: tx.value > 0n ? `0x${tx.value.toString(16)}` : '0x0',
        },
      ],
    });

    // Step 5: Wait for confirmation
    await this.waitForTx(txHash, 60);

    return {
      txHash,
      buyAmount: quote.buyAmount,
      sellAmount: quote.sellAmount,
    };
  }
}
