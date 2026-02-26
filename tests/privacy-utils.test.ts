/**
 * ORB402 — Privacy Utils Tests
 *
 * Unit tests for the core privacy primitives: nonce generation,
 * proof IDs, amount obfuscation, and split calculation.
 */

import { describe, it, expect } from 'vitest';
import {
  generatePrivacyNonce,
  getProofId,
  obfuscateAmountForPrivacy,
  calculateSplits,
  calculateSplitSchedule,
  calculateRelayerDelay,
  generateMockProof,
} from '../src/lib/privacy-utils';

describe('generatePrivacyNonce', () => {
  it('should generate a hex string', () => {
    const nonce = generatePrivacyNonce('0x1234567890abcdef');
    expect(nonce).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should generate unique nonces for the same wallet', () => {
    const nonce1 = generatePrivacyNonce('0xABC');
    const nonce2 = generatePrivacyNonce('0xABC');
    expect(nonce1).not.toBe(nonce2);
  });

  it('should generate different nonces for different wallets', () => {
    const nonce1 = generatePrivacyNonce('0xAAA');
    const nonce2 = generatePrivacyNonce('0xBBB');
    expect(nonce1).not.toBe(nonce2);
  });
});

describe('getProofId', () => {
  it('should return a bytes32 hex string', () => {
    const nonce = generatePrivacyNonce('0x123');
    const proofId = getProofId(nonce);
    expect(proofId).toMatch(/^0x[0-9a-f]{64}$/);
  });

  it('should be deterministic for the same nonce', () => {
    const nonce = '0x' + 'ab'.repeat(32);
    const id1 = getProofId(nonce);
    const id2 = getProofId(nonce);
    expect(id1).toBe(id2);
  });

  it('should produce different IDs for different nonces', () => {
    const id1 = getProofId('0x' + 'aa'.repeat(32));
    const id2 = getProofId('0x' + 'bb'.repeat(32));
    expect(id1).not.toBe(id2);
  });
});

describe('obfuscateAmountForPrivacy', () => {
  it('should return an amount close to the original', () => {
    const { obfuscatedAmount } = obfuscateAmountForPrivacy(100);
    expect(obfuscatedAmount).toBeGreaterThanOrEqual(100);
    expect(obfuscatedAmount).toBeLessThanOrEqual(120); // max ~15% noise
  });

  it('should always return at least the original amount', () => {
    for (let i = 0; i < 50; i++) {
      const { obfuscatedAmount } = obfuscateAmountForPrivacy(50);
      expect(obfuscatedAmount).toBeGreaterThanOrEqual(50);
    }
  });

  it('should report the difference', () => {
    const { obfuscatedAmount, difference } = obfuscateAmountForPrivacy(200);
    expect(difference).toBeCloseTo(obfuscatedAmount - 200, 2);
  });

  it('should include the obfuscation method', () => {
    const { method } = obfuscateAmountForPrivacy(100);
    expect(typeof method).toBe('string');
    expect(method.length).toBeGreaterThan(0);
  });
});

describe('calculateSplits', () => {
  it('should return 2-4 splits', () => {
    const splits = calculateSplits(500_000_000n);
    expect(splits.length).toBeGreaterThanOrEqual(2);
    expect(splits.length).toBeLessThanOrEqual(4);
  });

  it('should sum to the original amount', () => {
    const total = 500_000_000n;
    const splits = calculateSplits(total);
    const sum = splits.reduce((a, b) => a + b, 0n);
    expect(sum).toBe(total);
  });

  it('should have all positive splits', () => {
    const splits = calculateSplits(1_000_000_000n);
    for (const split of splits) {
      expect(split).toBeGreaterThan(0n);
    }
  });

  it('should work with small amounts', () => {
    const splits = calculateSplits(20_000_000n); // $20
    const sum = splits.reduce((a, b) => a + b, 0n);
    expect(sum).toBe(20_000_000n);
  });
});

describe('calculateSplitSchedule', () => {
  it('should return correct number of times', () => {
    const schedule = calculateSplitSchedule(3);
    expect(schedule).toHaveLength(3);
  });

  it('should return Date objects', () => {
    const schedule = calculateSplitSchedule(2);
    for (const date of schedule) {
      expect(date).toBeInstanceOf(Date);
    }
  });

  it('should be in ascending order', () => {
    const schedule = calculateSplitSchedule(4);
    for (let i = 1; i < schedule.length; i++) {
      expect(schedule[i].getTime()).toBeGreaterThanOrEqual(schedule[i - 1].getTime());
    }
  });
});

describe('calculateRelayerDelay', () => {
  it('should return a positive number', () => {
    const delay = calculateRelayerDelay();
    expect(delay).toBeGreaterThan(0);
  });

  it('should be within expected range', () => {
    for (let i = 0; i < 20; i++) {
      const delay = calculateRelayerDelay();
      expect(delay).toBeGreaterThanOrEqual(500);
      expect(delay).toBeLessThanOrEqual(60_000);
    }
  });
});

describe('generateMockProof', () => {
  it('should return proof bytes', () => {
    const { proofBytes } = generateMockProof('0xABC', 100_000_000n, '0x' + 'ab'.repeat(32));
    expect(proofBytes).toMatch(/^0x/);
    expect(proofBytes.length).toBeGreaterThan(10);
  });

  it('should return commitment bytes', () => {
    const { commitmentBytes } = generateMockProof('0xABC', 100_000_000n, '0x' + 'ab'.repeat(32));
    expect(commitmentBytes).toMatch(/^0x/);
  });

  it('should return blinding factor bytes', () => {
    const { blindingFactorBytes } = generateMockProof('0xABC', 100_000_000n, '0x' + 'ab'.repeat(32));
    expect(blindingFactorBytes).toMatch(/^0x/);
  });

  it('should generate different proofs for different inputs', () => {
    const proof1 = generateMockProof('0xAAA', 100n, '0x' + 'aa'.repeat(32));
    const proof2 = generateMockProof('0xBBB', 200n, '0x' + 'bb'.repeat(32));
    expect(proof1.proofBytes).not.toBe(proof2.proofBytes);
  });
});
