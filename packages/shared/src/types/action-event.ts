/**
 * ActionEvent — events emitted during run execution.
 * Used by the action stream in the run dashboard.
 */

export interface ActionEvent {
	id: string;
	runId: string;
	timestamp: string;
	agentId: string;
	role: string;
	action: string;
	detail: string;
}
