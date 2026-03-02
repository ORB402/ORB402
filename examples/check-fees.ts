/**
 * ORB402 — Fee Calculator Example
 *
 * Quick utility to preview withdrawal fees at different tiers.
 *
 * Usage:
 *   npx tsx examples/check-fees.ts
 */

import { calculateWithdrawalFees } from '../src/zk/withdraw';

const amounts = [50, 100, 500, 1_000, 10_000];
const discounts = [
  { label: 'No tokens', discount: 0 },
  { label: 'Bronze (100 ORB)', discount: 0.1 },
  { label: 'Silver (1k ORB)', discount: 0.25 },
  { label: 'Gold (10k ORB)', discount: 0.5 },
  { label: 'Platinum (100k ORB)', discount: 0.75 },
];

console.log('ORB402 — Withdrawal Fee Calculator\n');
console.log('Base fee: 1.0% withdrawal + 0.5% pool maintenance = 1.5% total');
console.log('Token holder discount applies to the withdrawal fee only.\n');

for (const { label, discount } of discounts) {
  console.log(`--- ${label} (${(discount * 100).toFixed(0)}% discount) ---`);

  for (const amount of amounts) {
    const fees = calculateWithdrawalFees(amount, discount);
    console.log(
      `  $${amount.toLocaleString().padStart(6)} → ` +
      `fee: $${fees.feeAmount.toFixed(2).padStart(7)} (${fees.totalFeePercent.toFixed(1)}%) → ` +
      `receive: $${fees.amountAfterFees.toFixed(2)}`,
    );
  }
  console.log();
}
