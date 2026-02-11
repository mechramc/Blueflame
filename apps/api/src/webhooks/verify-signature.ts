/**
 * GitHub webhook signature verification.
 *
 * Validates the HMAC-SHA256 signature sent in the X-Hub-Signature-256 header
 * to ensure the webhook payload is authentic.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Verify a GitHub webhook signature.
 *
 * @param payload - The raw request body (string or Buffer)
 * @param signature - The X-Hub-Signature-256 header value
 * @param secret - The webhook secret configured in the GitHub App
 * @returns true if the signature is valid
 */
export function verifyWebhookSignature(
	payload: string | Buffer,
	signature: string,
	secret: string,
): boolean {
	if (!signature || !secret) {
		return false;
	}

	const expectedPrefix = "sha256=";
	if (!signature.startsWith(expectedPrefix)) {
		return false;
	}

	const hmac = createHmac("sha256", secret);
	hmac.update(typeof payload === "string" ? payload : payload.toString("utf-8"));
	const computed = `sha256=${hmac.digest("hex")}`;

	// Use timing-safe comparison to prevent timing attacks
	try {
		return timingSafeEqual(Buffer.from(signature, "utf-8"), Buffer.from(computed, "utf-8"));
	} catch {
		// Buffers have different lengths → signatures don't match
		return false;
	}
}
