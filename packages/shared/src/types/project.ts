/**
 * Project — top-level entity representing a refinement project.
 *
 * Partition key: /id (single-tenant for hackathon).
 * Future: migrate to /orgId for multi-tenant and portfolio-level partitioning.
 */

export interface Project {
	id: string;
	name: string;
	description: string;
	status: ProjectStatus;
	createdBy: string;
	createdAt: string;
	updatedAt: string;
	specCount: number;
	runCount: number;
	lastActivityAt: string;
}

export type ProjectStatus = "active" | "archived" | "completed";
