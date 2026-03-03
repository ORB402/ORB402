/**
 * ORB402 Swap Module
 *
 * Token swap infrastructure using Permit2 SignatureTransfer
 * and DEX aggregation on Base L2.
 *
 * @example
 * ```ts
 * import { ORB402Swapper, BASE_TOKENS, parseTokenAmount } from '@orb402/privacy-sdk/swap';
 *
 * const swapper = new ORB402Swapper(window.ethereum, '/api/swap');
 *
 * // Get price
 * const price = await swapper.getPrice({
 *   sellToken: BASE_TOKENS[0].address, // ETH
 *   buyToken: BASE_TOKENS[1].address,  // USDC
 *   sellAmount: parseTokenAmount('0.1', 18),
 * });
 *
 * // Execute swap
 * const result = await swapper.swap({
 *   sellToken: BASE_TOKENS[0].address,
 *   buyToken: BASE_TOKENS[1].address,
 *   sellAmount: parseTokenAmount('0.1', 18),
 *   slippageBps: 300, // 3%
 * });
 * ```
 */

export { ORB402Swapper } from './swapper';
export { BASE_TOKENS, NATIVE_TOKEN_ADDRESS, BASE_CHAIN_ID, PERMIT2_ADDRESS, isNativeToken } from './constants';
export { parseTokenAmount, formatTokenAmount } from './utils';
export type {
  TokenInfo,
  SwapPriceResult,
  SwapQuoteResult,
  SwapResult,
  SwapFeeConfig,
  SwapParams,
  SwapStep,
} from './types';
