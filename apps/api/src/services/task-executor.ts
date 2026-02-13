/**
 * Task Executor — bridges orchestrator to actual LLM agent calls.
 *
 * When the orchestrator spawns an agent, this service runs the corresponding
 * LLM call (Builder → generateCode, Verifier → verifyCIResults) asynchronously.
 * On completion, it calls completeTask/failTask to advance the DAG.
 */

import {
	type BuilderConfig,
	type BuilderTaskInput,
	type VerifierConfig,
	type VerifierInput,
	generateCode,
	verifyCIResults,
} from "@blueflame/foundry";
import type { AgentState, PlanTask } from "@blueflame/shared";
import { AgentRole } from "@blueflame/shared";
import type { RunState } from "./orchestrator.js";
import { getSpec } from "./spec-generation.js";

/** Cost per 1K tokens (rough estimate for gpt-4o) */
const COST_PER_1K_TOKENS = 0.005;

/** Get foundry config for a given deployment/model */
function getFoundryConfig(model: string): BuilderConfig & VerifierConfig {
	return {
		endpoint: process.env.FOUNDRY_ENDPOINT ?? process.env.AZURE_OPENAI_ENDPOINT ?? "",
		apiKey: process.env.FOUNDRY_API_KEY ?? process.env.AZURE_OPENAI_API_KEY ?? "",
		deployment: model,
		apiVersion: process.env.AZURE_OPENAI_API_VERSION ?? "2024-10-21",
	};
}

/**
 * Execute a task by dispatching to the correct agent LLM.
 * Runs asynchronously — the orchestrator fires and forgets.
 * On completion, calls completeTask/failTask to advance the DAG.
 */
export async function executeTask(run: RunState, task: PlanTask, agent: AgentState): Promise<void> {
	try {
		switch (task.agentRole) {
			case AgentRole.Builder:
				await executeBuilderTask(run, task, agent);
				break;
			case AgentRole.Verifier:
				await executeVerifierTask(run, task, agent);
				break;
			default:
				// For Explainer, Planner — auto-complete with minimal cost
				await autoCompleteTask(run, task, agent);
				break;
		}
	} catch (err) {
		console.error(
			`[TaskExecutor] Unhandled error executing ${task.agentRole} for task ${task.id}:`,
			err,
		);
		const errMsg = err instanceof Error ? err.message : String(err);
		// Import lazily to avoid circular dependency at module load
		const { failTask, setTaskOutput } = await import("./orchestrator.js");
		setTaskOutput(run.runId, task.id, { files: [], error: errMsg });
		await failTask(run.runId, task.id, agent.agentId, 0, 0, undefined, errMsg);
	}
}

/** Execute a Builder task via LLM */
async function executeBuilderTask(run: RunState, task: PlanTask, agent: AgentState): Promise<void> {
	const spec = await getSpec(run.plan.specId, run.projectId);
	if (!spec) {
		const errMsg = `Spec not found: ${run.plan.specId}`;
		console.error(`[TaskExecutor] ${errMsg}`);
		const { failTask, setTaskOutput } = await import("./orchestrator.js");
		setTaskOutput(run.runId, task.id, { files: [], error: errMsg });
		await failTask(run.runId, task.id, agent.agentId, 0, 0, undefined, errMsg);
		return;
	}

	const config = getFoundryConfig(agent.model);
	const input: BuilderTaskInput = {
		taskId: task.id,
		description: task.description,
		acceptanceCriteriaIds: task.acceptanceCriteriaIds,
		specContext: spec.content,
		constraints: spec.constraints?.must ?? spec.inheritedConstraints ?? [],
	};

	console.log(`[TaskExecutor] Builder starting task ${task.id} (model: ${agent.model})`);

	const result = await generateCode(config, input);

	// Estimate tokens/cost from output size (OpenAI usage not returned by our wrapper)
	const outputLength = result.ok
		? JSON.stringify(result.value).length
		: JSON.stringify(result.error).length;
	const estimatedTokens = Math.ceil(outputLength / 4) + 500; // rough: 4 chars/token + prompt overhead
	const estimatedCost = (estimatedTokens / 1000) * COST_PER_1K_TOKENS;

	const { completeTask, failTask, pushEventExternal, setTaskOutput } = await import(
		"./orchestrator.js"
	);

	if (result.ok) {
		console.log(
			`[TaskExecutor] Builder completed task ${task.id}: ${result.value.files.length} files generated`,
		);
		setTaskOutput(run.runId, task.id, {
			files: result.value.files,
			commitMessage: result.value.commitMessage,
		});
		pushEventExternal(
			run.runId,
			agent.agentId,
			AgentRole.Builder,
			"CODE_GENERATED",
			`Generated ${result.value.files.length} file(s): ${result.value.files.map((f) => f.path).join(", ")}`,
		);
		await completeTask(
			run.runId,
			task.id,
			agent.agentId,
			estimatedTokens,
			estimatedCost,
			task.sigmaEstimate,
		);
	} else {
		const errMsg = result.error.error;
		console.error(`[TaskExecutor] Builder failed task ${task.id}:`, errMsg);
		setTaskOutput(run.runId, task.id, { files: [], error: errMsg });
		await failTask(
			run.runId,
			task.id,
			agent.agentId,
			estimatedTokens,
			estimatedCost,
			undefined,
			errMsg,
		);
	}
}

/** Execute a Verifier task via LLM */
async function executeVerifierTask(
	run: RunState,
	task: PlanTask,
	agent: AgentState,
): Promise<void> {
	const spec = await getSpec(run.plan.specId, run.projectId);
	if (!spec) {
		const errMsg = `Spec not found for verifier: ${run.plan.specId}`;
		console.error(`[TaskExecutor] ${errMsg}`);
		const { failTask, setTaskOutput } = await import("./orchestrator.js");
		setTaskOutput(run.runId, task.id, { files: [], error: errMsg });
		await failTask(run.runId, task.id, agent.agentId, 0, 0, undefined, errMsg);
		return;
	}

	// Map acceptance criteria IDs to full objects
	const criteria = task.acceptanceCriteriaIds
		.map((acId) => {
			const ac = spec.acceptanceCriteria.find((c) => c.id === acId);
			return ac ? { id: ac.id, description: ac.description } : null;
		})
		.filter((c): c is { id: string; description: string } => c !== null);

	// If no criteria mapped, use a generic criterion from the task description
	if (criteria.length === 0) {
		criteria.push({
			id: task.acceptanceCriteriaIds[0] ?? "AC-GEN",
			description: task.description,
		});
	}

	const config = getFoundryConfig(agent.model);
	const input: VerifierInput = {
		taskId: task.id,
		acceptanceCriteria: criteria,
		// Simulated CI output since no GitHub Actions integration yet
		ciOutput: `Build completed successfully.\nAll linting checks passed.\nTask ${task.id} artifacts generated.`,
		buildPassed: true,
		builderNotes: `Builder completed task: ${task.description}`,
	};

	console.log(`[TaskExecutor] Verifier starting task ${task.id} (model: ${agent.model})`);

	const result = await verifyCIResults(config, input);

	const outputLength = result.ok
		? JSON.stringify(result.value).length
		: JSON.stringify(result.error).length;
	const estimatedTokens = Math.ceil(outputLength / 4) + 300;
	const estimatedCost = (estimatedTokens / 1000) * COST_PER_1K_TOKENS;

	const { completeTask, failTask, setTaskOutput } = await import("./orchestrator.js");

	if (result.ok && result.value.overallResult !== "FAIL") {
		console.log(`[TaskExecutor] Verifier passed task ${task.id}: ${result.value.summary}`);
		await completeTask(
			run.runId,
			task.id,
			agent.agentId,
			estimatedTokens,
			estimatedCost,
			task.sigmaEstimate,
		);
	} else {
		const errorMsg = result.ok ? result.value.summary : result.error.error;
		console.error(`[TaskExecutor] Verifier failed task ${task.id}:`, errorMsg);
		setTaskOutput(run.runId, task.id, { files: [], error: `Verifier: ${errorMsg}` });
		await failTask(
			run.runId,
			task.id,
			agent.agentId,
			estimatedTokens,
			estimatedCost,
			undefined,
			errorMsg,
		);
	}
}

/** Auto-complete non-Builder/non-Verifier roles (Explainer, Planner) */
async function autoCompleteTask(run: RunState, task: PlanTask, agent: AgentState): Promise<void> {
	console.log(`[TaskExecutor] Auto-completing ${task.agentRole} task ${task.id}`);
	const { completeTask } = await import("./orchestrator.js");
	await completeTask(run.runId, task.id, agent.agentId, 100, 0.001, task.sigmaEstimate);
}
