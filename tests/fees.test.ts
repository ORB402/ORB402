/**
 * ORB402 — Fee Calculation Tests
 */

import { describe, it, expect } from 'vitest';
import { calculateWithdrawalFees } from '../src/zk/withdraw';

describe('calculateWithdrawalFees', () => {
  it('should calculate base fees correctly', () => {
    const fees = calculateWithdrawalFees(100);
    expect(fees.totalFeePercent).toBe(1.5); // 1.0% withdraw + 0.5% pool
    expect(fees.feeAmount).toBe(1.5);
    expect(fees.amountAfterFees).toBe(98.5);
  });

  it('should apply fee discount', () => {
    const fees = calculateWithdrawalFees(100, 0.5); // 50% discount
    // Withdraw fee: 1.0% * 0.5 = 0.5%, Pool fee: 0.5% (no discount)
    expect(fees.totalFeePercent).toBe(1.0);
    expect(fees.feeAmount).toBe(1.0);
    expect(fees.amountAfterFees).toBe(99.0);
  });

  it('should apply full discount', () => {
    const fees = calculateWithdrawalFees(100, 1.0); // 100% discount
    // Withdraw fee: 0%, Pool fee: 0.5%
    expect(fees.totalFeePercent).toBe(0.5);
    expect(fees.feeAmount).toBe(0.5);
    expect(fees.amountAfterFees).toBe(99.5);
  });

  it('should handle large amounts', () => {
    const fees = calculateWithdrawalFees(50_000);
    expect(fees.feeAmount).toBe(750); // 1.5% of 50k
    expect(fees.amountAfterFees).toBe(49_250);
  });

  it('should handle no discount (default)', () => {
    const fees = calculateWithdrawalFees(200);
    expect(fees.totalFeePercent).toBe(1.5);
    expect(fees.feeAmount).toBe(3.0);
    expect(fees.amountAfterFees).toBe(197.0);
  });
});
