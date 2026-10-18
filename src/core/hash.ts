/**
 * SHA-256 of a string as lowercase hex, using the browser's SubtleCrypto.
 * SubtleCrypto exists only in secure contexts (https, localhost). Elsewhere this returns null
 * rather than falling back to a weak hash, so a server never mistakes a weak hash for a strong one.
 */
export async function sha256Hex(input: string): Promise<string | null> {
  const subtle = globalThis.crypto?.subtle;
  if (!subtle) return null;
  const digest = await subtle.digest("SHA-256", new TextEncoder().encode(input));
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}
