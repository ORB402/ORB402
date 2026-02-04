/**
 * ORB402 — Encoding Utilities
 *
 * Low-level encoding/decoding helpers for instruction data, amounts,
 * and byte arrays used in on-chain proof operations.
 */

import { ethers } from 'ethers';

// ============================================================================
// Amount Encoding
// ============================================================================

/**
 * Encode a USD amount to token units (6 decimals).
 *
 * @param amount - Amount in USD (e.g. 100.50)
 * @param decimals - Token decimals (default: 6 for USDC/USDT)
 * @returns BigInt amount in token units
 *
 * @example
 * ```ts
 * encodeAmount(100)    // 100_000_000n
 * encodeAmount(0.01)   // 10_000n
 * ```
 */
export function encodeAmount(amount: number, decimals: number = 6): bigint {
  return ethers.parseUnits(amount.toString(), decimals);
}

/**
 * Decode token units to USD amount.
 *
 * @param units - Amount in token units
 * @param decimals - Token decimals (default: 6)
 * @returns Number amount in USD
 */
export function decodeAmount(units: bigint, decimals: number = 6): number {
  return Number(ethers.formatUnits(units, decimals));
}

// ============================================================================
// Byte Array Utilities
// ============================================================================

/**
 * Encode a u64 value as little-endian bytes (8 bytes).
 * Used for Solana instruction data encoding.
 *
 * @param value - Number or BigInt to encode
 * @returns 8-byte Uint8Array in little-endian format
 */
export function encodeU64LE(value: number | bigint): Uint8Array {
  const buffer = new ArrayBuffer(8);
  const view = new DataView(buffer);
  const bigValue = BigInt(value);

  for (let i = 0; i < 8; i++) {
    view.setUint8(i, Number((bigValue >> BigInt(i * 8)) & 0xffn));
  }

  return new Uint8Array(buffer);
}

/**
 * Decode a little-endian u64 from bytes.
 *
 * @param bytes - Uint8Array containing the encoded value
 * @param offset - Starting offset (default: 0)
 * @returns Decoded BigInt value
 */
export function decodeU64LE(bytes: Uint8Array, offset: number = 0): bigint {
  let value = 0n;
  for (let i = 0; i < 8; i++) {
    value |= BigInt(bytes[offset + i]) << BigInt(i * 8);
  }
  return value;
}

/**
 * Build instruction data from a discriminator and encoded parameters.
 *
 * @param discriminator - 8-byte instruction discriminator
 * @param params - Array of encoded parameter byte arrays
 * @returns Combined instruction data
 */
export function buildInstructionData(
  discriminator: number[],
  ...params: Uint8Array[]
): Uint8Array {
  const totalLength = 8 + params.reduce((sum, p) => sum + p.length, 0);
  const result = new Uint8Array(totalLength);

  result.set(new Uint8Array(discriminator), 0);

  let offset = 8;
  for (const param of params) {
    result.set(param, offset);
    offset += param.length;
  }

  return result;
}

// ============================================================================
// Hash Utilities
// ============================================================================

/**
 * Compute keccak256 hash of a hex string.
 *
 * @param data - Hex-encoded data string
 * @returns keccak256 hash as hex string
 */
export function keccak256(data: string): string {
  return ethers.keccak256(data);
}

/**
 * Compute keccak256 hash of packed values.
 * Used for proof ID derivation and commitment hashing.
 *
 * @param types - Solidity types array
 * @param values - Values to pack
 * @returns keccak256 hash as bytes32 hex string
 */
export function solidityPackedKeccak256(types: string[], values: unknown[]): string {
  return ethers.solidityPackedKeccak256(types, values);
}

// ============================================================================
// Address Utilities
// ============================================================================

/**
 * Validate an EVM address.
 *
 * @param address - Address to validate
 * @returns true if valid EVM address
 */
export function isValidEvmAddress(address: string): boolean {
  try {
    ethers.getAddress(address);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checksum an EVM address.
 *
 * @param address - Address to checksum
 * @returns Checksummed address
 */
export function checksumAddress(address: string): string {
  return ethers.getAddress(address);
}
