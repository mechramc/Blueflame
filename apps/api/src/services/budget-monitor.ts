/**
 * Budget Monitor — watches run cost against budget ceiling.
 *
 * Emits WARNING at 80% and PAUSE at 95% of budget ceiling.
 * Integrates with orchestrator to pause execution and SignalR for alerts.
 */

import { BudgetDecision } from "@blueflame/shared";
import { getRunCost } from "./cost-tracker.js";

/** Budget state for a run */
export interface BudgetState {
	runId: string;
	ceiling: number;
	currentSpend: number;
	percentUsed: number;
	warningEmitted: boolean;
	pauseTriggered: boolean;
}

/** Budget alert levels */
export enum BudgetAlertLevel {
	Normal = "NORMAL",
	Warning = "WARNING",
	Critical = "CRITICAL",
}

/** In-memory budget state per run */
const budgetStates = new Map<string, BudgetState>();

/** Callback for budget alerts (wired to SignalR) */
export type BudgetAlertCallback = (
	runId: string,
	level: BudgetAlertLevel,
	currentSpend: number,
	ceiling: number,
	percentUsed: number,
) => void;

let alertCallback: BudgetAlertCallback | null = null;

/** Callback for pause trigger (wired to orchestrator) */
export type PauseTriggerCallback = (runId: string) => void;

let pauseCallback: PauseTriggerCallback | null = null;

/**
 * Register callbacks for budget events.
 */
export function onBudgetAlert(callback: BudgetAlertCallback): void {
	alertCallback = callback;
}

export function onPauseTrigger(callback: PauseTriggerCallback): void {
	pauseCallback = callback;
}

/**
 * Initialize budget tracking for a run.
 */
export function initBudget(runId: string, ceiling: number): BudgetState {
	const state: BudgetState = {
		runId,
		ceiling,
		currentSpend: 0,
		percentUsed: 0,
		warningEmitted: false,
		pauseTriggered: false,
	};
	budgetStates.set(runId, state);
	return state;
}

/**
 * Check and update budget status for a run.
 * Should be called after each cost recording.
 *
 * @returns The current alert level
 */
export function checkBudget(runId: string): BudgetAlertLevel {
	const state = budgetStates.get(runId);
	if (!state) return BudgetAlertLevel.Normal;

	const currentSpend = getRunCost(runId);
	state.currentSpend = currentSpend;
	state.percentUsed = state.ceiling > 0 ? (currentSpend / state.ceiling) * 100 : 0;

	// Critical: 95%+ → trigger pause
	if (state.percentUsed >= 95 && !state.pauseTriggered) {
		state.pauseTriggered = true;
		if (alertCallback) {
			alertCallback(
				runId,
				BudgetAlertLevel.Critical,
				currentSpend,
				state.ceiling,
				state.percentUsed,
			);
		}
		if (pauseCallback) {
			pauseCallback(runId);
		}
		return BudgetAlertLevel.Critical;
	}

	// Warning: 80%+ → emit warning (once)
	if (state.percentUsed >= 80 && !state.warningEmitted) {
		state.warningEmitted = true;
		if (alertCallback) {
			alertCallback(
				runId,
				BudgetAlertLevel.Warning,
				currentSpend,
				state.ceiling,
				state.percentUsed,
			);
		}
		return BudgetAlertLevel.Warning;
	}

	if (state.percentUsed >= 80) {
		return BudgetAlertLevel.Warning;
	}

	return BudgetAlertLevel.Normal;
}

/**
 * Get budget state for a run.
 */
export function getBudgetState(runId: string): BudgetState | undefined {
	const state = budgetStates.get(runId);
	if (!state) return undefined;

	// Refresh spend from cost tracker
	state.currentSpend = getRunCost(runId);
	state.percentUsed = state.ceiling > 0 ? (state.currentSpend / state.ceiling) * 100 : 0;

	return state;
}

/**
 * Handle a budget decision from the user after pause.
 */
export function handleBudgetDecision(
	runId: string,
	decision: BudgetDecision,
	topUpAmount?: number,
): BudgetState | undefined {
	const state = budgetStates.get(runId);
	if (!state) return undefined;

	switch (decision) {
		case BudgetDecision.Resume:
			if (topUpAmount && topUpAmount > 0) {
				state.ceiling += topUpAmount;
			}
			state.pauseTriggered = false;
			state.warningEmitted = false; // Reset warning for new ceiling
			break;

		case BudgetDecision.Accept:
			// Accept partial results — no changes needed, run stays paused
			break;

		case BudgetDecision.Abandon:
			// Abandon — no changes needed, run will be marked failed
			break;
	}

	// Recalculate percent
	state.percentUsed = state.ceiling > 0 ? (state.currentSpend / state.ceiling) * 100 : 0;
	return state;
}

/**
 * Clear all budget states (for testing).
 */
export function clearAllBudgets(): void {
	budgetStates.clear();
	alertCallback = null;
	pauseCallback = null;
}
