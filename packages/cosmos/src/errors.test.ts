import { describe, expect, it } from "vitest";
import {
	ConflictError,
	CosmosError,
	NotFoundError,
	PreconditionError,
	TooManyRequestsError,
	wrapCosmosError,
} from "./errors.js";

describe("Cosmos Errors", () => {
	it("should create NotFoundError with correct properties", () => {
		const err = new NotFoundError("specs", "spec-1", "project-1");
		expect(err.statusCode).toBe(404);
		expect(err.name).toBe("NotFoundError");
		expect(err.message).toContain("spec-1");
	});

	it("should create ConflictError with correct properties", () => {
		const err = new ConflictError("runs", "run-1");
		expect(err.statusCode).toBe(409);
		expect(err.name).toBe("ConflictError");
	});

	it("should create PreconditionError with correct properties", () => {
		const err = new PreconditionError("runs", "run-1");
		expect(err.statusCode).toBe(412);
		expect(err.name).toBe("PreconditionError");
	});

	it("should create TooManyRequestsError with retry info", () => {
		const err = new TooManyRequestsError(2000, "activity-123");
		expect(err.statusCode).toBe(429);
		expect(err.retryAfterMs).toBe(2000);
		expect(err.activityId).toBe("activity-123");
	});

	describe("wrapCosmosError", () => {
		it("should wrap 404 as NotFoundError", () => {
			const err = wrapCosmosError({ code: 404 }, "specs", "spec-1");
			expect(err).toBeInstanceOf(NotFoundError);
		});

		it("should wrap 409 as ConflictError", () => {
			const err = wrapCosmosError({ code: 409 }, "runs", "run-1");
			expect(err).toBeInstanceOf(ConflictError);
		});

		it("should wrap 412 as PreconditionError", () => {
			const err = wrapCosmosError({ code: 412 }, "runs", "run-1");
			expect(err).toBeInstanceOf(PreconditionError);
		});

		it("should wrap 429 as TooManyRequestsError", () => {
			const err = wrapCosmosError({ code: 429, retryAfterInMs: 3000 }, "specs");
			expect(err).toBeInstanceOf(TooManyRequestsError);
			expect((err as TooManyRequestsError).retryAfterMs).toBe(3000);
		});

		it("should wrap unknown errors as generic CosmosError", () => {
			const err = wrapCosmosError({ code: 500 }, "specs");
			expect(err).toBeInstanceOf(CosmosError);
			expect(err.statusCode).toBe(500);
		});

		it("should return existing CosmosError unchanged", () => {
			const original = new CosmosError("test", 500);
			const wrapped = wrapCosmosError(original, "specs");
			expect(wrapped).toBe(original);
		});
	});
});
