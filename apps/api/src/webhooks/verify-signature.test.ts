import { createHmac } from "node:crypto";
import { describe, expect, it } from "vitest";
import { verifyWebhookSignature } from "./verify-signature.js";

function sign(payload: string, secret: string): string {
	const hmac = createHmac("sha256", secret);
	hmac.update(payload);
	return `sha256=${hmac.digest("hex")}`;
}

describe("verifyWebhookSignature", () => {
	const secret = "test-webhook-secret";

	it("should return true for valid signature", () => {
		const payload = '{"action":"completed"}';
		const signature = sign(payload, secret);
		expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
	});

	it("should return false for invalid signature", () => {
		const payload = '{"action":"completed"}';
		expect(
			verifyWebhookSignature(payload, "sha256=invalid", secret),
		).toBe(false);
	});

	it("should return false for tampered payload", () => {
		const payload = '{"action":"completed"}';
		const signature = sign(payload, secret);
		expect(
			verifyWebhookSignature('{"action":"hacked"}', signature, secret),
		).toBe(false);
	});

	it("should return false for empty signature", () => {
		expect(verifyWebhookSignature("payload", "", secret)).toBe(false);
	});

	it("should return false for empty secret", () => {
		expect(verifyWebhookSignature("payload", "sha256=abc", "")).toBe(false);
	});

	it("should return false for missing sha256 prefix", () => {
		expect(verifyWebhookSignature("payload", "md5=abc", secret)).toBe(false);
	});

	it("should handle Buffer payload", () => {
		const payload = Buffer.from('{"action":"completed"}');
		const signature = sign(payload.toString("utf-8"), secret);
		expect(verifyWebhookSignature(payload, signature, secret)).toBe(true);
	});
});
