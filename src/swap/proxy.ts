/**
 * ORB402 Swap API Proxy
 *
 * Example server-side proxy that forwards swap requests to a DEX aggregator.
 * This avoids CORS issues when calling aggregator APIs from a browser.
 *
 * Deploy this as a serverless function (Vercel, Cloudflare Workers, etc.)
 * and point the ORB402Swapper's apiBaseUrl to it.
 *
 * @example
 * // Deploy two routes:
 * //   GET /api/swap/price  → proxies to aggregator price endpoint
 * //   GET /api/swap/quote  → proxies to aggregator quote endpoint
 */

// Replace with your chosen DEX aggregator API
const AGGREGATOR_BASE_URL = 'https://api.example.com/swap';

/**
 * Generic proxy handler — forwards query params to the aggregator.
 *
 * @param endpoint - "price" or "quote"
 * @param queryParams - URL search params from the incoming request
 * @returns The aggregator's JSON response
 */
export async function proxySwapRequest(
  endpoint: 'price' | 'quote',
  queryParams: Record<string, string>
): Promise<{ status: number; data: any }> {
  const query = new URLSearchParams(queryParams).toString();
  const url = `${AGGREGATOR_BASE_URL}/${endpoint}?${query}`;

  const response = await fetch(url, {
    method: 'GET',
    headers: { Accept: 'application/json' },
  });

  const data = await response.json();

  return {
    status: response.status,
    data,
  };
}

/**
 * Example usage in a serverless function:
 *
 * ```ts
 * export default async function handler(req, res) {
 *   // Set CORS headers
 *   res.setHeader('Access-Control-Allow-Origin', '*');
 *   res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
 *   if (req.method === 'OPTIONS') return res.status(204).end();
 *
 *   const { status, data } = await proxySwapRequest('price', req.query);
 *   return res.status(status).json(data);
 * }
 * ```
 */
