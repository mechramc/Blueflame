/**
 * PendingFix — represents a fixer agent's proposed code fix awaiting human approval.
 *
 * Part of WF3: Build-to-Verify fixer loop.
 */

export interface PendingFix {
	/** Task ID that failed verification */
	taskId: string;
	/** Agent ID of the fixer that produced this fix */
	fixerId: string;
	/** Original code/output that failed verification */
	originalCode: string;
	/** Proposed fix from the fixer agent */
	fixedCode: string;
	/** Fixer's explanation of the change */
	explanation: string;
	/** Current retry count (max 3) */
	retryCount: number;
	/** Timestamp of fix creation */
	createdAt: string;
}
