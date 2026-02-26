/**
 * ORB402 — Validation Tests
 */

import { describe, it, expect } from 'vitest';
import {
  validateAmount,
  validateAddress,
  validateTransferParams,
  validateChain,
} from '../src/utils/validation';

describe('validateAmount', () => {
  it('should accept valid amounts', () => {
    expect(() => validateAmount(100)).not.toThrow();
    expect(() => validateAmount(1)).not.toThrow();
    expect(() => validateAmount(99_999)).not.toThrow();
  });

  it('should reject zero', () => {
    expect(() => validateAmount(0)).toThrow('at least');
  });

  it('should reject negative amounts', () => {
    expect(() => validateAmount(-10)).toThrow('at least');
  });

  it('should reject amounts over limit', () => {
    expect(() => validateAmount(200_000)).toThrow('cannot exceed');
  });

  it('should reject NaN', () => {
    expect(() => validateAmount(NaN)).toThrow('valid number');
  });
});

describe('validateAddress', () => {
  it('should accept valid EVM addresses', () => {
    expect(() =>
      validateAddress('0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', 'base'),
    ).not.toThrow();
  });

  it('should reject invalid EVM addresses', () => {
    expect(() => validateAddress('0x123', 'base')).toThrow('invalid Base address');
    expect(() => validateAddress('', 'base')).toThrow('required');
  });

  it('should accept valid Solana addresses', () => {
    expect(() =>
      validateAddress('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', 'solana'),
    ).not.toThrow();
  });

  it('should reject invalid Solana addresses', () => {
    expect(() => validateAddress('abc', 'solana')).toThrow('invalid Solana address');
  });
});

describe('validateTransferParams', () => {
  const validParams = {
    senderWallet: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
    recipientWallet: '0xfde4C96c8593536E31F229EA8f37b2ADa2699bb2',
    amount: 100,
    token: 'USDC' as const,
  };

  it('should accept valid params', () => {
    expect(() => validateTransferParams(validParams)).not.toThrow();
  });

  it('should reject same sender and recipient', () => {
    expect(() =>
      validateTransferParams({
        ...validParams,
        recipientWallet: validParams.senderWallet,
      }),
    ).toThrow('same address');
  });

  it('should reject invalid token', () => {
    expect(() =>
      validateTransferParams({
        ...validParams,
        token: 'DOGE' as any,
      }),
    ).toThrow('unsupported token');
  });
});

describe('validateChain', () => {
  it('should accept supported chains', () => {
    expect(() => validateChain('base')).not.toThrow();
    expect(() => validateChain('solana')).not.toThrow();
  });

  it('should reject unsupported chains', () => {
    expect(() => validateChain('ethereum')).toThrow('unsupported chain');
    expect(() => validateChain('polygon')).toThrow('unsupported chain');
  });
});
