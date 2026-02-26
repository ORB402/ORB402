/**
 * ORB402 — Encoding Utils Tests
 */

import { describe, it, expect } from 'vitest';
import {
  encodeAmount,
  decodeAmount,
  encodeU64LE,
  decodeU64LE,
  buildInstructionData,
  isValidEvmAddress,
} from '../src/utils/encoding';

describe('encodeAmount', () => {
  it('should encode whole dollar amounts', () => {
    expect(encodeAmount(100)).toBe(100_000_000n);
    expect(encodeAmount(1)).toBe(1_000_000n);
  });

  it('should encode fractional amounts', () => {
    expect(encodeAmount(0.01)).toBe(10_000n);
    expect(encodeAmount(1.5)).toBe(1_500_000n);
  });

  it('should handle custom decimals', () => {
    expect(encodeAmount(1, 18)).toBe(1_000_000_000_000_000_000n);
  });
});

describe('decodeAmount', () => {
  it('should decode token units to USD', () => {
    expect(decodeAmount(100_000_000n)).toBe(100);
    expect(decodeAmount(1_500_000n)).toBe(1.5);
  });

  it('should be inverse of encodeAmount', () => {
    const original = 42.5;
    const encoded = encodeAmount(original);
    const decoded = decodeAmount(encoded);
    expect(decoded).toBe(original);
  });
});

describe('encodeU64LE / decodeU64LE', () => {
  it('should roundtrip small values', () => {
    const bytes = encodeU64LE(42);
    expect(decodeU64LE(bytes)).toBe(42n);
  });

  it('should roundtrip large values', () => {
    const value = 1_000_000_000_000n;
    const bytes = encodeU64LE(value);
    expect(decodeU64LE(bytes)).toBe(value);
  });

  it('should encode in little-endian format', () => {
    const bytes = encodeU64LE(256);
    expect(bytes[0]).toBe(0);
    expect(bytes[1]).toBe(1);
  });

  it('should handle zero', () => {
    const bytes = encodeU64LE(0);
    expect(decodeU64LE(bytes)).toBe(0n);
  });
});

describe('buildInstructionData', () => {
  it('should combine discriminator and params', () => {
    const disc = [1, 2, 3, 4, 5, 6, 7, 8];
    const param = new Uint8Array([10, 20, 30]);
    const result = buildInstructionData(disc, param);

    expect(result.length).toBe(11); // 8 + 3
    expect(result[0]).toBe(1);
    expect(result[7]).toBe(8);
    expect(result[8]).toBe(10);
  });

  it('should handle multiple params', () => {
    const disc = [0, 0, 0, 0, 0, 0, 0, 0];
    const p1 = new Uint8Array([1, 2]);
    const p2 = new Uint8Array([3, 4, 5]);
    const result = buildInstructionData(disc, p1, p2);

    expect(result.length).toBe(13); // 8 + 2 + 3
    expect(result[8]).toBe(1);
    expect(result[10]).toBe(3);
  });
});

describe('isValidEvmAddress', () => {
  it('should accept valid addresses', () => {
    expect(isValidEvmAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913')).toBe(true);
  });

  it('should reject invalid addresses', () => {
    expect(isValidEvmAddress('not-an-address')).toBe(false);
    expect(isValidEvmAddress('0x123')).toBe(false);
    expect(isValidEvmAddress('')).toBe(false);
  });
});
