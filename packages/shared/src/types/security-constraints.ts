/**
 * Security constraint types — specialized constraint schemas for CI/CD security checks.
 *
 * Extends the base Constraint with security-specific subtypes:
 * CVE_CHECK, LICENSE_COMPLIANCE, SECRET_SCANNING, DEPENDENCY_AUDIT
 */

import { z } from "zod";

/** Security constraint subtype */
export enum SecurityConstraintSubtype {
	CveCheck = "CVE_CHECK",
	LicenseCompliance = "LICENSE_COMPLIANCE",
	SecretScanning = "SECRET_SCANNING",
	DependencyAudit = "DEPENDENCY_AUDIT",
}

/** CVE check constraint — verify no known CVEs in dependencies */
export const CveCheckSchema = z.object({
	subtype: z.literal(SecurityConstraintSubtype.CveCheck),
	/** Maximum severity to allow (low, moderate, high, critical) */
	maxSeverity: z.enum(["low", "moderate", "high", "critical"]),
	/** Allow specific CVE IDs to be ignored (with justification) */
	ignoredCves: z
		.array(
			z.object({
				cveId: z.string().regex(/^CVE-\d{4}-\d+$/),
				justification: z.string().min(1),
			}),
		)
		.default([]),
});
export type CveCheckConfig = z.infer<typeof CveCheckSchema>;

/** License compliance constraint — verify all deps use approved licenses */
export const LicenseComplianceSchema = z.object({
	subtype: z.literal(SecurityConstraintSubtype.LicenseCompliance),
	/** Allowed license identifiers (SPDX format) */
	allowedLicenses: z.array(z.string()).min(1),
	/** Explicitly blocked licenses */
	blockedLicenses: z.array(z.string()).default([]),
});
export type LicenseComplianceConfig = z.infer<typeof LicenseComplianceSchema>;

/** Secret scanning constraint — no secrets in code */
export const SecretScanningSchema = z.object({
	subtype: z.literal(SecurityConstraintSubtype.SecretScanning),
	/** File patterns to scan (glob format) */
	includePatterns: z.array(z.string()).default(["**/*.ts", "**/*.js", "**/*.json", "**/*.env*"]),
	/** File patterns to exclude */
	excludePatterns: z.array(z.string()).default(["node_modules/**", "dist/**"]),
	/** Custom regex patterns to detect (in addition to built-in patterns) */
	customPatterns: z.array(z.string()).default([]),
});
export type SecretScanningConfig = z.infer<typeof SecretScanningSchema>;

/** Dependency audit constraint — verify dependency health */
export const DependencyAuditSchema = z.object({
	subtype: z.literal(SecurityConstraintSubtype.DependencyAudit),
	/** Maximum allowed age for dependencies (days) */
	maxDependencyAgeDays: z.number().positive().default(365),
	/** Block deprecated packages */
	blockDeprecated: z.boolean().default(true),
	/** Minimum required maintainers for direct dependencies */
	minMaintainers: z.number().nonnegative().default(1),
});
export type DependencyAuditConfig = z.infer<typeof DependencyAuditSchema>;

/** Union of all security constraint configs */
export const SecurityConstraintConfigSchema = z.discriminatedUnion("subtype", [
	CveCheckSchema,
	LicenseComplianceSchema,
	SecretScanningSchema,
	DependencyAuditSchema,
]);
export type SecurityConstraintConfig = z.infer<typeof SecurityConstraintConfigSchema>;

/**
 * Security constraint — extends base Constraint with a typed config.
 */
export interface SecurityConstraint {
	constraintId: string;
	projectId: string;
	subtype: SecurityConstraintSubtype;
	config: SecurityConstraintConfig;
	/** Whether the constraint is currently active */
	enabled: boolean;
	createdAt: string;
	updatedAt: string;
}
