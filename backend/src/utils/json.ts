/**
 * JSON BigInt serialization utility
 *
 * Converts native JavaScript BigInt values to string representation
 * so that JSON.stringify can serialize Prisma BigInt columns (such as volume, avgVolume20D)
 * without throwing "TypeError: Do not know how to serialize a BigInt".
 */
export function serializeBigInt<T>(data: T): T {
  return JSON.parse(
    JSON.stringify(data, (_, value) =>
      typeof value === 'bigint' ? value.toString() : value
    )
  );
}
