/**
 * Projects route — CRUD for refinement projects.
 */

import {
	ConstraintEnforcement,
	ConstraintScope,
	ConstraintSource,
	ConstraintType,
} from "@blueflame/shared";
import type { Constraint, Project } from "@blueflame/shared";
import { Router } from "express";
import { z } from "zod";

import { db } from "../db.js";
import { requireRole } from "../middleware/auth.js";
import { getRunsByProject } from "../services/orchestrator.js";

const router = Router();

const CreateProjectSchema = z.object({
	name: z.string().min(1).max(200),
	description: z.string().max(2000).default(""),
});

const UpdateProjectSchema = z.object({
	name: z.string().min(1).max(200).optional(),
	description: z.string().max(2000).optional(),
	status: z.enum(["active", "archived", "completed"]).optional(),
});

/** GET /api/projects — list all projects */
router.get("/", async (req, res) => {
	try {
		const search = req.query.q as string | undefined;
		const projects = search ? await db.projects.search(search) : await db.projects.findAll();
		res.json({ projects });
	} catch (error) {
		console.error("[Projects] List error:", error);
		res.status(500).json({ error: "Failed to list projects" });
	}
});

/** GET /api/projects/:projectId — get a single project */
router.get("/:projectId", async (req, res) => {
	try {
		const result = await db.projects.read(req.params.projectId, req.params.projectId);
		if (!result.ok) {
			res.status(404).json({ error: "Project not found" });
			return;
		}
		res.json({ project: result.value });
	} catch (error) {
		console.error("[Projects] Read error:", error);
		res.status(500).json({ error: "Failed to read project" });
	}
});

/** POST /api/projects — create a new project (requires Editor role) */
router.post("/", requireRole("Blueflame_Editor"), async (req, res) => {
	const parsed = CreateProjectSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: parsed.error.flatten().fieldErrors });
		return;
	}

	const now = new Date().toISOString();
	const id = `proj-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

	const project: Project & { id: string } = {
		id,
		name: parsed.data.name,
		description: parsed.data.description,
		status: "active",
		createdBy: req.user?.name ?? req.user?.preferred_username ?? "unknown",
		createdAt: now,
		updatedAt: now,
		specCount: 0,
		runCount: 0,
		lastActivityAt: now,
	};

	try {
		const result = await db.projects.create(project, id);
		if (!result.ok) {
			res.status(500).json({ error: "Failed to create project" });
			return;
		}
		res.status(201).json({ project: result.value });
	} catch (error) {
		console.error("[Projects] Create error:", error);
		res.status(500).json({ error: "Failed to create project" });
	}
});

/** PUT /api/projects/:projectId — update a project */
router.put("/:projectId", requireRole("Blueflame_Editor"), async (req, res) => {
	try {
		const parsed = UpdateProjectSchema.safeParse(req.body);
		if (!parsed.success) {
			res.status(400).json({ error: parsed.error.flatten().fieldErrors });
			return;
		}

		const projectId = req.params.projectId as string;
		const readResult = await db.projects.read(projectId, projectId);
		if (!readResult.ok) {
			res.status(404).json({ error: "Project not found" });
			return;
		}

		const updated = {
			...readResult.value,
			...parsed.data,
			updatedAt: new Date().toISOString(),
		};

		const writeResult = await db.projects.update(updated, projectId);
		if (!writeResult.ok) {
			res.status(500).json({ error: "Failed to update project" });
			return;
		}

		res.json({ project: writeResult.value });
	} catch (error) {
		console.error("[Projects] Update error:", error);
		res.status(500).json({ error: "Failed to update project" });
	}
});

/** GET /api/projects/:projectId/runs — list all runs for a project (newest first) */
router.get("/:projectId/runs", async (req, res) => {
	try {
		const allRuns = await getRunsByProject(req.params.projectId);
		// Return lightweight summaries (not full run state with all task outputs)
		const runs = allRuns.map((r) => ({
			runId: r.runId,
			status: r.status,
			specId: r.plan?.specId ?? "",
			createdAt: r.startedAt ?? "",
			startedAt: r.startedAt ?? null,
			endedAt: r.completedAt ?? null,
			costActual: 0,
			costBudget: r.plan?.tasks?.reduce((sum, t) => sum + (t.estimatedCost ?? 0), 0) ?? 0,
		}));
		res.json({ runs });
	} catch (error) {
		console.error("[Projects] List runs error:", error);
		res.status(500).json({ error: "Failed to list runs" });
	}
});

// ---- Constraint Registry ----

const CreateConstraintSchema = z.object({
	rule: z.string().min(1).max(1000),
	type: z.nativeEnum(ConstraintType).default(ConstraintType.Architectural),
	enforcement: z.nativeEnum(ConstraintEnforcement).default(ConstraintEnforcement.Hard),
});

/** GET /api/projects/:projectId/constraints — list project constraints */
router.get("/:projectId/constraints", async (req, res) => {
	try {
		const constraints = await db.constraints.findByProject(req.params.projectId);
		res.json({ constraints });
	} catch (error) {
		console.error("[Projects] List constraints error:", error);
		res.status(500).json({ error: "Failed to list constraints" });
	}
});

/** POST /api/projects/:projectId/constraints — add a constraint */
router.post("/:projectId/constraints", async (req, res) => {
	const parsed = CreateConstraintSchema.safeParse(req.body);
	if (!parsed.success) {
		res.status(400).json({ error: parsed.error.flatten().fieldErrors });
		return;
	}

	const now = new Date().toISOString();
	const id = `const-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	const projectId = req.params.projectId;

	const constraint: Constraint & { id: string } = {
		id,
		constraintId: id,
		projectId,
		scope: ConstraintScope.Project,
		type: parsed.data.type,
		rule: parsed.data.rule,
		enforcement: parsed.data.enforcement,
		verificationMethod: "agent-check",
		source: ConstraintSource.UserDefined,
		createdAt: now,
		updatedAt: now,
		createdBy: req.user?.name ?? req.user?.preferred_username ?? "unknown",
	};

	try {
		const result = await db.constraints.create(constraint, projectId);
		if (!result.ok) {
			res.status(500).json({ error: "Failed to create constraint" });
			return;
		}
		res.status(201).json({ constraint: result.value });
	} catch (error) {
		console.error("[Projects] Create constraint error:", error);
		res.status(500).json({ error: "Failed to create constraint" });
	}
});

/** DELETE /api/projects/:projectId/constraints/:constraintId — remove a constraint */
router.delete("/:projectId/constraints/:constraintId", async (req, res) => {
	try {
		const result = await db.constraints.delete(req.params.constraintId, req.params.projectId);
		if (!result.ok) {
			res.status(404).json({ error: "Constraint not found" });
			return;
		}
		res.json({ deleted: true });
	} catch (error) {
		console.error("[Projects] Delete constraint error:", error);
		res.status(500).json({ error: "Failed to delete constraint" });
	}
});

/** DELETE /api/projects/:projectId — permanently delete a project */
router.delete("/:projectId", requireRole("Blueflame_Admin"), async (req, res) => {
	try {
		const projectId = req.params.projectId as string;
		const deleteResult = await db.projects.delete(projectId, projectId);
		if (!deleteResult.ok) {
			res.status(404).json({ error: "Project not found" });
			return;
		}

		res.json({ deleted: true, projectId });
	} catch (error) {
		console.error("[Projects] Delete error:", error);
		res.status(500).json({ error: "Failed to delete project" });
	}
});

export const projectsRouter = router;
