/**
 * Tests for swap utility functions
 */

import { describe, it, expect } from 'vitest';
import { parseTokenAmount, formatTokenAmount } from '../src/swap/utils';
import { isNativeToken, NATIVE_TOKEN_ADDRESS, BASE_TOKENS } from '../src/swap/constants';

describe('parseTokenAmount', () => {
  it('parses whole number with 6 decimals (USDC)', () => {
    expect(parseTokenAmount('1', 6)).toBe(1000000n);
  });

  it('parses decimal number with 6 decimals', () => {
    expect(parseTokenAmount('1.5', 6)).toBe(1500000n);
  });

  it('parses whole number with 18 decimals (ETH)', () => {
    expect(parseTokenAmount('1', 18)).toBe(1000000000000000000n);
  });

  it('parses small decimal with 18 decimals', () => {
    expect(parseTokenAmount('0.01', 18)).toBe(10000000000000000n);
  });

  it('truncates excess decimal places', () => {
    expect(parseTokenAmount('1.1234567', 6)).toBe(1123456n);
  });

  it('returns 0n for empty string', () => {
    expect(parseTokenAmount('', 6)).toBe(0n);
  });

  it('returns 0n for invalid input', () => {
    expect(parseTokenAmount('abc', 6)).toBe(0n);
  });
});

describe('formatTokenAmount', () => {
  it('formats 6-decimal token (USDC)', () => {
    expect(formatTokenAmount(1500000n, 6)).toBe('1.5');
  });

  it('formats whole amount without trailing zeros', () => {
    expect(formatTokenAmount(1000000n, 6)).toBe('1');
  });

  it('formats 18-decimal token (ETH)', () => {
    expect(formatTokenAmount(10000000000000000n, 18)).toBe('0.01');
  });

  it('formats zero', () => {
    expect(formatTokenAmount(0n, 6)).toBe('0');
  });

  it('formats small amounts correctly', () => {
    expect(formatTokenAmount(1n, 6)).toBe('0.000001');
  });
});

describe('isNativeToken', () => {
  it('identifies native token address', () => {
    expect(isNativeToken(NATIVE_TOKEN_ADDRESS)).toBe(true);
  });

  it('identifies native token (case-insensitive)', () => {
    expect(isNativeToken('0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee')).toBe(true);
  });

  it('rejects non-native token', () => {
    expect(isNativeToken('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(false);
  });
});

describe('BASE_TOKENS', () => {
  it('has at least 5 tokens', () => {
    expect(BASE_TOKENS.length).toBeGreaterThanOrEqual(5);
  });

  it('first token is ETH', () => {
    expect(BASE_TOKENS[0].symbol).toBe('ETH');
    expect(BASE_TOKENS[0].decimals).toBe(18);
  });

  it('includes USDC with 6 decimals', () => {
    const usdc = BASE_TOKENS.find((t) => t.symbol === 'USDC');
    expect(usdc).toBeDefined();
    expect(usdc!.decimals).toBe(6);
  });

  it('includes USDT with 6 decimals', () => {
    const usdt = BASE_TOKENS.find((t) => t.symbol === 'USDT');
    expect(usdt).toBeDefined();
    expect(usdt!.decimals).toBe(6);
  });
});
