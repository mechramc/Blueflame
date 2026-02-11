import { describe, expect, it } from "vitest";
import { sha256 } from "./hash.js";

describe("sha256", () => {
	it("should produce a 64-character hex string", () => {
		const hash = sha256("hello");
		expect(hash).toHaveLength(64);
		expect(hash).toMatch(/^[a-f0-9]{64}$/);
	});

	it("should produce deterministic results", () => {
		expect(sha256("test")).toBe(sha256("test"));
	});

	it("should produce different hashes for different inputs", () => {
		expect(sha256("hello")).not.toBe(sha256("world"));
	});

	it("should match known SHA-256 value", () => {
		// echo -n "hello" | sha256sum
		expect(sha256("hello")).toBe(
			"2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
		);
	});
});
