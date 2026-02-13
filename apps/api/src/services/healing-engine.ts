/**
 * Healing Engine — WF5 Autonomous Healing.
 *
 * Analyzes systematic failures and creates a new project + spec
 * to address recurring issues. Triggered automatically when 3+ similar
 * failures are detected, or manually via API.
 */

import type { NormalizedFailure, Project } from "@blueflame/shared";
import { db } from "../db.js";

/** Threshold for auto-healing trigger */
const AUTO_HEAL_THRESHOLD = 3;

/** Pattern match result for failure clustering */
export interface FailureCluster {
	pattern: string;
	failures: NormalizedFailure[];
	count: number;
	isInfrastructure: boolean;
}

/**
 * Cluster failures by similarity (error message prefix, failure source, step name).
 */
export function clusterFailures(failures: NormalizedFailure[]): FailureCluster[] {
	const clusters = new Map<string, NormalizedFailure[]>();

	for (const failure of failures) {
		// Create cluster key from failure source + first failed step
		const stepKey = failure.failedSteps?.[0]?.name ?? "unknown";
		const sourceKey = failure.source ?? "unknown";
		const key = `${sourceKey}::${stepKey}`;

		const existing = clusters.get(key) ?? [];
		existing.push(failure);
		clusters.set(key, existing);
	}

	return [...clusters.entries()].map(([pattern, clusteredFailures]) => ({
		pattern,
		failures: clusteredFailures,
		count: clusteredFailures.length,
		isInfrastructure: isInfrastructureFailure(pattern),
	}));
}

/**
 * Check if a failure pattern indicates infrastructure-level issues.
 */
function isInfrastructureFailure(pattern: string): boolean {
	const infraPatterns = [
		"timeout",
		"connection",
		"oom",
		"disk",
		"permission",
		"quota",
		"rate-limit",
		"dns",
		"certificate",
		"auth",
	];
	const lower = pattern.toLowerCase();
	return infraPatterns.some((p) => lower.includes(p));
}

/**
 * Determine if auto-healing should be triggered.
 */
export function shouldAutoHeal(failures: NormalizedFailure[]): boolean {
	if (failures.length < AUTO_HEAL_THRESHOLD) return false;

	const clusters = clusterFailures(failures);
	// Auto-heal if any single pattern appears 3+ times or if infrastructure failure detected
	return clusters.some((c) => c.count >= AUTO_HEAL_THRESHOLD || c.isInfrastructure);
}

/**
 * Create a healing project from systematic failures.
 * Generates a new project that addresses the root causes.
 */
export async function createHealingProject(
	failures: NormalizedFailure[],
	sourceProjectId: string,
): Promise<Project> {
	const clusters = clusterFailures(failures);
	const topCluster = clusters.sort((a, b) => b.count - a.count)[0];

	const now = new Date().toISOString();
	const healingProjectId = `heal-${sourceProjectId}-${Date.now()}`;

	const description = buildHealingDescription(clusters, sourceProjectId);

	const project: Project = {
		id: healingProjectId,
		name: `Healing: ${topCluster?.pattern ?? "Systematic Failures"}`,
		description,
		status: "active",
		createdBy: "healing-engine",
		createdAt: now,
		updatedAt: now,
		specCount: 0,
		runCount: 0,
		lastActivityAt: now,
	};

	// Persist to Cosmos
	const result = await db.projects.create(project, healingProjectId);
	if (!result.ok) {
		// If conflict (already exists), return as-is
		return project;
	}

	return result.value as unknown as Project;
}

/**
 * Build a description for the healing project based on failure clusters.
 */
function buildHealingDescription(clusters: FailureCluster[], sourceProjectId: string): string {
	const lines = [
		`Auto-generated healing project for recurring failures in project ${sourceProjectId}.`,
		"",
		"## Failure Patterns Detected",
		"",
	];

	for (const cluster of clusters.sort((a, b) => b.count - a.count)) {
		const infraTag = cluster.isInfrastructure ? " [INFRASTRUCTURE]" : "";
		lines.push(`- **${cluster.pattern}**${infraTag}: ${cluster.count} occurrences`);
	}

	lines.push(
		"",
		"## Recommended Actions",
		"",
		"1. Review the failure patterns above",
		"2. Generate a spec to address root causes",
		"3. Execute the healing plan",
	);

	return lines.join("\n");
}

/**
 * Get failure clusters for a project (for API transparency).
 */
export async function getFailureClusters(projectId: string): Promise<FailureCluster[]> {
	try {
		const failures = await db.failures.findByProject(projectId);
		return clusterFailures(failures as unknown as NormalizedFailure[]);
	} catch {
		return [];
	}
}
