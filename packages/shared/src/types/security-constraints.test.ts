import { describe, expect, it } from "vitest";

import {
	CveCheckSchema,
	DependencyAuditSchema,
	LicenseComplianceSchema,
	SecretScanningSchema,
	SecurityConstraintConfigSchema,
	SecurityConstraintSubtype,
} from "./security-constraints.js";

describe("SecurityConstraintSubtype", () => {
	it("should have 4 subtypes", () => {
		const subtypes = Object.values(SecurityConstraintSubtype);
		expect(subtypes).toHaveLength(4);
		expect(subtypes).toContain("CVE_CHECK");
		expect(subtypes).toContain("LICENSE_COMPLIANCE");
		expect(subtypes).toContain("SECRET_SCANNING");
		expect(subtypes).toContain("DEPENDENCY_AUDIT");
	});
});

describe("CveCheckSchema", () => {
	it("should validate a valid CVE check config", () => {
		const result = CveCheckSchema.safeParse({
			subtype: "CVE_CHECK",
			maxSeverity: "high",
			ignoredCves: [{ cveId: "CVE-2024-1234", justification: "Not applicable to our use case" }],
		});
		expect(result.success).toBe(true);
	});

	it("should reject invalid CVE ID format", () => {
		const result = CveCheckSchema.safeParse({
			subtype: "CVE_CHECK",
			maxSeverity: "high",
			ignoredCves: [{ cveId: "invalid", justification: "test" }],
		});
		expect(result.success).toBe(false);
	});

	it("should default ignoredCves to empty array", () => {
		const result = CveCheckSchema.parse({
			subtype: "CVE_CHECK",
			maxSeverity: "critical",
		});
		expect(result.ignoredCves).toEqual([]);
	});
});

describe("LicenseComplianceSchema", () => {
	it("should validate a valid license config", () => {
		const result = LicenseComplianceSchema.safeParse({
			subtype: "LICENSE_COMPLIANCE",
			allowedLicenses: ["MIT", "Apache-2.0", "ISC", "BSD-3-Clause"],
			blockedLicenses: ["GPL-3.0"],
		});
		expect(result.success).toBe(true);
	});

	it("should require at least one allowed license", () => {
		const result = LicenseComplianceSchema.safeParse({
			subtype: "LICENSE_COMPLIANCE",
			allowedLicenses: [],
		});
		expect(result.success).toBe(false);
	});
});

describe("SecretScanningSchema", () => {
	it("should provide sensible defaults", () => {
		const result = SecretScanningSchema.parse({
			subtype: "SECRET_SCANNING",
		});
		expect(result.includePatterns.length).toBeGreaterThan(0);
		expect(result.excludePatterns).toContain("node_modules/**");
		expect(result.customPatterns).toEqual([]);
	});
});

describe("DependencyAuditSchema", () => {
	it("should provide sensible defaults", () => {
		const result = DependencyAuditSchema.parse({
			subtype: "DEPENDENCY_AUDIT",
		});
		expect(result.maxDependencyAgeDays).toBe(365);
		expect(result.blockDeprecated).toBe(true);
		expect(result.minMaintainers).toBe(1);
	});

	it("should reject negative age", () => {
		const result = DependencyAuditSchema.safeParse({
			subtype: "DEPENDENCY_AUDIT",
			maxDependencyAgeDays: -1,
		});
		expect(result.success).toBe(false);
	});
});

describe("SecurityConstraintConfigSchema (discriminated union)", () => {
	it("should discriminate by subtype", () => {
		const cve = SecurityConstraintConfigSchema.parse({
			subtype: "CVE_CHECK",
			maxSeverity: "high",
		});
		expect(cve.subtype).toBe("CVE_CHECK");

		const license = SecurityConstraintConfigSchema.parse({
			subtype: "LICENSE_COMPLIANCE",
			allowedLicenses: ["MIT"],
		});
		expect(license.subtype).toBe("LICENSE_COMPLIANCE");
	});

	it("should reject unknown subtype", () => {
		const result = SecurityConstraintConfigSchema.safeParse({
			subtype: "UNKNOWN",
		});
		expect(result.success).toBe(false);
	});
});
