/**
 * ORB402 — SDK Configuration
 *
 * Manages SDK configuration including chain selection, contract addresses,
 * and privacy settings. All sensitive values (RPC URLs, private keys) must
 * be provided by the consumer — they are never stored or defaulted.
 */

import { BASE_CHAIN_CONFIG, SOLANA_CONFIG, PRIVACY_LEVELS } from '../constants';
import type { ChainConfig, PrivacyLevel } from '../types';

// ============================================================================
// Configuration Types
// ============================================================================

export interface ORB402Config {
  /** Target chain */
  chain: 'base' | 'solana';
  /** RPC endpoint URL */
  rpcUrl: string;
  /** ORB402PrivacyPool contract address (EVM) or program ID (Solana) */
  privacyPoolAddress: string;
  /** DepositRouter contract address (EVM only) */
  depositRouterAddress?: string;
  /** Default privacy level */
  defaultPrivacyLevel: PrivacyLevel;
  /** Token to use (USDC or USDT) */
  token: 'USDC' | 'USDT';
  /** Custom token address override */
  tokenAddress?: string;
}

export interface ValidatedConfig extends ORB402Config {
  /** Resolved token address */
  resolvedTokenAddress: string;
  /** Chain configuration */
  chainConfig: ChainConfig;
}

// ============================================================================
// Configuration Factory
// ============================================================================

/**
 * Create an ORB402 SDK configuration.
 *
 * @param options - Configuration options
 * @returns Validated configuration object
 *
 * @example
 * ```ts
 * const config = createConfig({
 *   chain: 'base',
 *   rpcUrl: 'https://mainnet.base.org',
 *   privacyPoolAddress: '0x...',
 *   token: 'USDC',
 * });
 * ```
 */
export function createConfig(options: Partial<ORB402Config> & {
  privacyPoolAddress: string;
}): ValidatedConfig {
  const chain = options.chain || 'base';
  const token = options.token || 'USDC';
  const privacyLevel = options.defaultPrivacyLevel || 'enhanced';

  // Resolve RPC URL
  const rpcUrl = options.rpcUrl || (
    chain === 'base' ? BASE_CHAIN_CONFIG.rpcUrl : SOLANA_CONFIG.rpcUrl
  );

  // Resolve token address
  let resolvedTokenAddress: string;
  if (options.tokenAddress) {
    resolvedTokenAddress = options.tokenAddress;
  } else if (chain === 'base') {
    resolvedTokenAddress = BASE_CHAIN_CONFIG.tokens[token].address;
  } else {
    resolvedTokenAddress = SOLANA_CONFIG.tokens[token].mint;
  }

  // Build chain config
  const chainConfig: ChainConfig = chain === 'base'
    ? {
        chain: 'base',
        rpcUrl,
        privacyPoolAddress: options.privacyPoolAddress,
        tokenAddress: resolvedTokenAddress,
      }
    : {
        chain: 'solana',
        rpcUrl,
        privacyPoolAddress: options.privacyPoolAddress,
        tokenAddress: resolvedTokenAddress,
      };

  const config: ValidatedConfig = {
    chain,
    rpcUrl,
    privacyPoolAddress: options.privacyPoolAddress,
    depositRouterAddress: options.depositRouterAddress,
    defaultPrivacyLevel: privacyLevel,
    token,
    tokenAddress: options.tokenAddress,
    resolvedTokenAddress,
    chainConfig,
  };

  validateConfig(config);
  return config;
}

// ============================================================================
// Validation
// ============================================================================

/**
 * Validate an ORB402 configuration.
 * Throws if the configuration is invalid.
 */
export function validateConfig(config: Partial<ORB402Config>): void {
  if (!config.privacyPoolAddress) {
    throw new Error('ORB402: privacyPoolAddress is required');
  }

  if (config.chain && !['base', 'solana'].includes(config.chain)) {
    throw new Error(`ORB402: unsupported chain "${config.chain}"`);
  }

  if (config.defaultPrivacyLevel && !PRIVACY_LEVELS[config.defaultPrivacyLevel]) {
    throw new Error(`ORB402: invalid privacy level "${config.defaultPrivacyLevel}"`);
  }

  if (config.token && !['USDC', 'USDT'].includes(config.token)) {
    throw new Error(`ORB402: unsupported token "${config.token}"`);
  }

  if (config.chain === 'base' && config.privacyPoolAddress) {
    if (!config.privacyPoolAddress.startsWith('0x') || config.privacyPoolAddress.length !== 42) {
      throw new Error('ORB402: invalid EVM address for privacyPoolAddress');
    }
  }
}
