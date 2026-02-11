/**
 * SHA-256 hashing utility for spec content.
 * Used during spec freeze to create a deterministic, immutable hash.
 */

import { createHash } from "node:crypto";

/**
 * Compute SHA-256 hash of content.
 * @returns Hex-encoded hash string.
 */
export function sha256(content: string): string {
	return createHash("sha256").update(content).digest("hex");
}
