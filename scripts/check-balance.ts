#!/usr/bin/env tsx
/**
 * ORB402 — Check Pool Balance
 *
 * Utility script to query a user's balance in the ORB402 privacy pool.
 *
 * Usage:
 *   npx tsx scripts/check-balance.ts --pool 0x... --wallet 0x... --token 0x...
 */

import { PoolClient } from '../src/core/pool';
import { BASE_CHAIN_CONFIG } from '../src/constants';

// ============================================================================
// CLI Argument Parsing
// ============================================================================

function parseArgs(): { pool: string; wallet: string; token: string; rpc: string } {
  const args = process.argv.slice(2);
  let pool = '';
  let wallet = '';
  let token = BASE_CHAIN_CONFIG.tokens.USDC.address;
  let rpc = BASE_CHAIN_CONFIG.rpcUrl;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--pool' && args[i + 1]) pool = args[++i];
    else if (args[i] === '--wallet' && args[i + 1]) wallet = args[++i];
    else if (args[i] === '--token' && args[i + 1]) token = args[++i];
    else if (args[i] === '--rpc' && args[i + 1]) rpc = args[++i];
  }

  if (!pool || !wallet) {
    console.error('Error: --pool and --wallet are required');
    console.error('Usage: npx tsx scripts/check-balance.ts --pool 0x... --wallet 0x...');
    process.exit(1);
  }

  return { pool, wallet, token, rpc };
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  const { pool, wallet, token, rpc } = parseArgs();

  console.log('ORB402 — Pool Balance Check\n');
  console.log(`Pool:   ${pool}`);
  console.log(`Wallet: ${wallet}`);
  console.log(`Token:  ${token}`);
  console.log(`RPC:    ${rpc}\n`);

  const client = new PoolClient(pool, rpc);
  const balance = await client.getBalance(wallet, token);

  const fmt = (v: bigint) => `${(Number(v) / 1_000_000).toFixed(2)} USDC`;

  console.log(`Available: ${fmt(balance.available)}`);
  console.log(`Locked:    ${fmt(balance.locked)}`);
  console.log(`Total:     ${fmt(balance.total)}`);
}

main().catch((err) => {
  console.error('Error:', err.message);
  process.exit(1);
});
