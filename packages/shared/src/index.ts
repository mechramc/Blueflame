/**
 * @blueflame/shared — Shared types and utilities
 *
 * All domain types, Zod schemas, and cross-package utilities live here.
 * Import via: import { ... } from "@blueflame/shared";
 */

export type Result<T, E = Error> = { ok: true; value: T } | { ok: false; error: E };

// Re-export all domain types
export * from "./types/index.js";
