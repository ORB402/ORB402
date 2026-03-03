/**
 * ORB402 Swap Module — Utility Functions
 *
 * Token amount parsing and formatting for arbitrary-decimal ERC-20 tokens.
 */

/**
 * Parse a human-readable token amount string into its smallest unit (bigint).
 *
 * @example
 * parseTokenAmount("1.5", 6)   // 1500000n  (USDC)
 * parseTokenAmount("0.1", 18)  // 100000000000000000n (ETH)
 */
export function parseTokenAmount(amount: string, decimals: number): bigint {
  if (!amount || isNaN(Number(amount))) return 0n;
  const [whole = '0', fraction = ''] = amount.split('.');
  const paddedFraction = fraction.padEnd(decimals, '0').slice(0, decimals);
  return BigInt(whole + paddedFraction);
}

/**
 * Format a token amount from smallest unit (bigint) to human-readable string.
 *
 * @example
 * formatTokenAmount(1500000n, 6)   // "1.5"
 * formatTokenAmount(1000000n, 6)   // "1"
 */
export function formatTokenAmount(amount: bigint, decimals: number): string {
  const str = amount.toString().padStart(decimals + 1, '0');
  const whole = str.slice(0, str.length - decimals);
  const fraction = str.slice(str.length - decimals);
  const trimmed = fraction.replace(/0+$/, '');
  return trimmed ? `${whole}.${trimmed}` : whole;
}
