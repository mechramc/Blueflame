import { UserRole } from "@blueflame/shared";
import type { NextFunction, Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { getHighestRole, hasMinimumRole, requireRole } from "./rbac.js";

describe("RBAC", () => {
	describe("getHighestRole", () => {
		it("should return Admin when user has multiple roles", () => {
			const result = getHighestRole([UserRole.Viewer, UserRole.Admin]);
			expect(result).toBe(UserRole.Admin);
		});

		it("should return the single role when user has one role", () => {
			const result = getHighestRole([UserRole.Editor]);
			expect(result).toBe(UserRole.Editor);
		});

		it("should return null when user has no recognized roles", () => {
			const result = getHighestRole(["SomeOtherRole"]);
			expect(result).toBeNull();
		});

		it("should return null when roles array is empty", () => {
			const result = getHighestRole([]);
			expect(result).toBeNull();
		});
	});

	describe("hasMinimumRole", () => {
		it("should return true when user has exact required role", () => {
			expect(hasMinimumRole([UserRole.Editor], UserRole.Editor)).toBe(true);
		});

		it("should return true when user has higher role than required", () => {
			expect(hasMinimumRole([UserRole.Admin], UserRole.Viewer)).toBe(true);
		});

		it("should return false when user has lower role than required", () => {
			expect(hasMinimumRole([UserRole.Viewer], UserRole.Authorizer)).toBe(false);
		});

		it("should return false when user has no roles", () => {
			expect(hasMinimumRole([], UserRole.Viewer)).toBe(false);
		});

		it("should check all roles and find the highest", () => {
			expect(hasMinimumRole([UserRole.Viewer, UserRole.Authorizer], UserRole.Authorizer)).toBe(
				true,
			);
		});
	});

	describe("requireRole middleware", () => {
		function createMockReqResNext(user?: { roles?: string[] }) {
			const req = { user } as Request;
			const res = {
				status: vi.fn().mockReturnThis(),
				json: vi.fn().mockReturnThis(),
			} as unknown as Response;
			const next = vi.fn() as NextFunction;
			return { req, res, next };
		}

		it("should call next() when user has sufficient role", () => {
			const { req, res, next } = createMockReqResNext({
				roles: [UserRole.Admin],
			});
			requireRole(UserRole.Editor)(req, res, next);
			expect(next).toHaveBeenCalled();
		});

		it("should return 403 when user has insufficient role", () => {
			const { req, res, next } = createMockReqResNext({
				roles: [UserRole.Viewer],
			});
			requireRole(UserRole.Authorizer)(req, res, next);
			expect(res.status).toHaveBeenCalledWith(403);
			expect(next).not.toHaveBeenCalled();
		});

		it("should return 401 when req.user is missing", () => {
			const { req, res, next } = createMockReqResNext(undefined);
			requireRole(UserRole.Viewer)(req, res, next);
			expect(res.status).toHaveBeenCalledWith(401);
			expect(next).not.toHaveBeenCalled();
		});

		it("should return 403 when user has no roles array", () => {
			const { req, res, next } = createMockReqResNext({ roles: undefined });
			requireRole(UserRole.Viewer)(req, res, next);
			expect(res.status).toHaveBeenCalledWith(403);
			expect(next).not.toHaveBeenCalled();
		});
	});
});
