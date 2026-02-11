import { describe, expect, it } from "vitest";
import { branchName } from "./client.js";

describe("branchName", () => {
	it("should generate correct branch name format", () => {
		expect(branchName("run-123", "TASK-001")).toBe("blueflame/run-run-123/task-TASK-001");
	});

	it("should handle different run and task IDs", () => {
		expect(branchName("abc", "TASK-042")).toBe("blueflame/run-abc/task-TASK-042");
	});
});
