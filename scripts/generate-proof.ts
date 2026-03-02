#!/usr/bin/env tsx
/**
 * ORB402 — Generate Test Proof
 *
 * Utility script to generate a mock ZK proof for testing.
 * Outputs the proof data that can be used with the upload-proof step.
 *
 * Usage:
 *   npx tsx scripts/generate-proof.ts --wallet 0x... --amount 100
 */

import { generatePrivacyNonce, getProofId, generateMockProof } from '../src/lib/privacy-utils';
import { encodeAmount } from '../src/utils/encoding';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): { wallet: string; amount: number } {
  const args = process.argv.slice(2);
  let wallet = '';
  let amount = 0;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--wallet' && args[i + 1]) {
      wallet = args[++i];
    } else if (args[i] === '--amount' && args[i + 1]) {
      amount = parseFloat(args[++i]);
    }
  }

  if (!wallet) {
    console.error('Error: --wallet is required');
    console.error('Usage: npx tsx scripts/generate-proof.ts --wallet 0x... --amount 100');
    process.exit(1);
  }

  if (!amount || amount <= 0) {
    console.error('Error: --amount must be a positive number');
    process.exit(1);
  }

  return { wallet, amount };
}

// ============================================================================
// Main
// ============================================================================

function main() {
  const { wallet, amount } = parseArgs();
  const amountInUnits = encodeAmount(amount);

  console.log('ORB402 — Proof Generation\n');
  console.log(`Wallet:  ${wallet}`);
  console.log(`Amount:  $${amount} (${amountInUnits} units)\n`);

  // Generate nonce and proof ID
  const nonce = generatePrivacyNonce(wallet);
  const proofId = getProofId(nonce);

  console.log(`Nonce:    ${nonce}`);
  console.log(`Proof ID: ${proofId}\n`);

  // Generate mock proof
  const proof = generateMockProof(wallet, amountInUnits, nonce);

  console.log('Proof Data:');
  console.log(`  proof:          ${proof.proofBytes.slice(0, 40)}...`);
  console.log(`  commitment:     ${proof.commitmentBytes.slice(0, 40)}...`);
  console.log(`  blindingFactor: ${proof.blindingFactorBytes.slice(0, 40)}...`);

  console.log('\n--- JSON Output ---\n');
  console.log(JSON.stringify({
    wallet,
    amount,
    amountInUnits: amountInUnits.toString(),
    nonce,
    proofId,
    proof: proof.proofBytes,
    commitment: proof.commitmentBytes,
    blindingFactor: proof.blindingFactorBytes,
  }, null, 2));
}

main();
