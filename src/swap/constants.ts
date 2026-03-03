/**
 * ORB402 Swap Module — Constants
 *
 * Token addresses, Permit2 contract, and chain configuration
 * for Base L2 token swaps.
 */

import type { Address } from 'viem';
import type { TokenInfo } from './types';

// ============================================================================
// Chain & Contract Constants
// ============================================================================

/** Native ETH placeholder address (used by most DEX aggregators) */
export const NATIVE_TOKEN_ADDRESS: Address =
  '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

/** Base mainnet chain ID */
export const BASE_CHAIN_ID = 8453;

/**
 * Permit2 canonical address (same on all EVM chains).
 * Used for gasless token approvals via EIP-712 signatures.
 * See: https://github.com/Uniswap/permit2
 */
export const PERMIT2_ADDRESS: Address =
  '0x000000000022D473030F116dDEE9F6B43aC78BA3';

// ============================================================================
// Base Token List
// ============================================================================

/** Default supported tokens on Base mainnet */
export const BASE_TOKENS: TokenInfo[] = [
  {
    symbol: 'ETH',
    name: 'Ether',
    address: NATIVE_TOKEN_ADDRESS,
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/279/small/ethereum.png',
  },
  {
    symbol: 'USDC',
    name: 'USD Coin',
    address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/6319/small/USD_Coin_icon.png',
  },
  {
    symbol: 'USDT',
    name: 'Tether',
    address: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    decimals: 6,
    logoUrl: 'https://assets.coingecko.com/coins/images/325/small/Tether.png',
  },
  {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: '0x4200000000000000000000000000000000000006',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/2518/small/weth.png',
  },
  {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb',
    decimals: 18,
    logoUrl: 'https://assets.coingecko.com/coins/images/9956/small/dai-multi-collateral-mcd.png',
  },
];

// ============================================================================
// Helpers
// ============================================================================

/** Check if a token address represents native ETH */
export function isNativeToken(address: Address): boolean {
  return address.toLowerCase() === NATIVE_TOKEN_ADDRESS.toLowerCase();
}
