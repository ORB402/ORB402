/**
 * ORB402 Token Swap Example
 *
 * Demonstrates how to use the ORB402Swapper to:
 *   1. Check token balances
 *   2. Get indicative pricing
 *   3. Execute a swap with Permit2 signatures
 *
 * Requirements:
 *   - An EIP-1193 wallet provider (MetaMask, Coinbase Wallet, etc.)
 *   - A swap API proxy deployed (see src/swap/proxy.ts)
 *   - ETH for gas on Base
 */

import {
  ORB402Swapper,
  BASE_TOKENS,
  parseTokenAmount,
  formatTokenAmount,
} from '../src/swap';
import type { Address } from 'viem';

async function main() {
  // In a real app, this comes from the wallet connection
  const provider = (window as any).ethereum;
  if (!provider) {
    console.error('No wallet provider found. Install MetaMask or similar.');
    return;
  }

  // Initialize the swapper
  // apiBaseUrl should point to your deployed swap proxy
  const swapper = new ORB402Swapper(provider, '/api/swap', {
    recipient: '0x0000000000000000000000000000000000000000' as Address,
    bps: 50, // 0.5% integrator fee
  });

  const taker = await swapper.getTakerAddress();
  console.log('Connected wallet:', taker);

  // Token references
  const ETH = BASE_TOKENS[0];  // Native ETH
  const USDC = BASE_TOKENS[1]; // USDC on Base

  // ── Step 1: Check balances ──────────────────────────────────────────
  const ethBalance = await swapper.getBalance(ETH.address, taker);
  const usdcBalance = await swapper.getBalance(USDC.address, taker);

  console.log(`ETH balance:  ${formatTokenAmount(ethBalance, ETH.decimals)}`);
  console.log(`USDC balance: ${formatTokenAmount(usdcBalance, USDC.decimals)}`);

  // ── Step 2: Get indicative price ────────────────────────────────────
  const sellAmount = parseTokenAmount('0.01', ETH.decimals); // 0.01 ETH

  console.log(`\nGetting price for ${formatTokenAmount(sellAmount, ETH.decimals)} ETH → USDC...`);

  const price = await swapper.getPrice({
    sellToken: ETH.address,
    buyToken: USDC.address,
    sellAmount,
    slippageBps: 300, // 3% slippage tolerance
  });

  console.log(`You would receive: ~${formatTokenAmount(price.buyAmount, USDC.decimals)} USDC`);
  console.log(`Min. received:     ${formatTokenAmount(price.minBuyAmount, USDC.decimals)} USDC`);
  console.log(`Est. gas:          ${formatTokenAmount(price.totalNetworkFee, 18)} ETH`);
  console.log(`Liquidity:         ${price.liquidityAvailable ? 'Available' : 'Insufficient'}`);

  // ── Step 3: Execute the swap ────────────────────────────────────────
  // Uncomment to actually execute:
  //
  // console.log('\nExecuting swap...');
  // const result = await swapper.swap({
  //   sellToken: ETH.address,
  //   buyToken: USDC.address,
  //   sellAmount,
  //   slippageBps: 300,
  // });
  //
  // console.log(`Swap successful!`);
  // console.log(`  TX: https://basescan.org/tx/${result.txHash}`);
  // console.log(`  Sold:     ${formatTokenAmount(result.sellAmount, ETH.decimals)} ETH`);
  // console.log(`  Received: ${formatTokenAmount(result.buyAmount, USDC.decimals)} USDC`);
}

main().catch(console.error);
