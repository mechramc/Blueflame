/**
 * Robust JSON extraction from LLM output.
 *
 * Handles common LLM JSON issues:
 * - JSON wrapped in markdown fences or prose
 * - Literal newlines/tabs inside JSON string values (must be \n, \t)
 * - Truncated responses (informative error)
 */

/**
 * Extracts and parses JSON from raw LLM output.
 *
 * Strategy (in order):
 * 1. Strip markdown code fences and try JSON.parse
 * 2. Sanitize unescaped control characters in string values and retry
 * 3. Find the outermost { ... } or [ ... ], sanitize, and try JSON.parse
 * 4. Throw with context about what was received
 */
export function extractJson<T = unknown>(raw: string): T {
	const trimmed = raw.trim();

	// Strategy 1: Strip markdown fences and try direct parse
	const fenceStripped = stripMarkdownFences(trimmed);
	try {
		return JSON.parse(fenceStripped) as T;
	} catch {
		// Fall through
	}

	// Strategy 2: Sanitize control chars in string values, then parse
	const sanitized = sanitizeJsonStrings(fenceStripped);
	try {
		return JSON.parse(sanitized) as T;
	} catch {
		// Fall through
	}

	// Strategy 3: Find outermost JSON, sanitize, and parse
	const extracted = findOutermostJson(trimmed);
	if (extracted !== null) {
		// Try raw first
		try {
			return JSON.parse(extracted) as T;
		} catch {
			// Try sanitized
		}
		const extractedSanitized = sanitizeJsonStrings(extracted);
		try {
			return JSON.parse(extractedSanitized) as T;
		} catch {
			// Fall through to error
		}
	}

	// Strategy 4: Informative error
	const preview = trimmed.slice(0, 200);
	throw new Error(`Failed to extract JSON from LLM response. First 200 chars: ${preview}`);
}

/**
 * Strips markdown code fences (```json ... ``` or ``` ... ```).
 */
function stripMarkdownFences(text: string): string {
	let cleaned = text;

	// Strip leading fence
	if (cleaned.startsWith("```json")) {
		cleaned = cleaned.slice(7);
	} else if (cleaned.startsWith("```")) {
		cleaned = cleaned.slice(3);
	}

	// Strip trailing fence
	if (cleaned.endsWith("```")) {
		cleaned = cleaned.slice(0, -3);
	}

	return cleaned.trim();
}

/**
 * Sanitizes literal control characters (newlines, tabs, carriage returns)
 * inside JSON string values. LLMs often emit multiline code in JSON string
 * fields with real newlines instead of \n escape sequences.
 *
 * Walks the text character-by-character, tracking whether we're inside a
 * JSON string. When inside a string, replaces:
 *   literal \n → \\n
 *   literal \r → \\r
 *   literal \t → \\t
 */
function sanitizeJsonStrings(text: string): string {
	const result: string[] = [];
	let inString = false;
	let escaped = false;

	for (let i = 0; i < text.length; i++) {
		const ch = text.charAt(i);

		if (escaped) {
			escaped = false;
			result.push(ch);
			continue;
		}

		if (ch === "\\" && inString) {
			escaped = true;
			result.push(ch);
			continue;
		}

		if (ch === '"' && !escaped) {
			inString = !inString;
			result.push(ch);
			continue;
		}

		if (inString) {
			// Replace literal control characters with JSON escape sequences
			if (ch === "\n") {
				result.push("\\n");
				continue;
			}
			if (ch === "\r") {
				result.push("\\r");
				continue;
			}
			if (ch === "\t") {
				result.push("\\t");
				continue;
			}
		}

		result.push(ch);
	}

	return result.join("");
}

/**
 * Finds the outermost JSON object { ... } or array [ ... ] in text.
 * Handles nested braces/brackets and JSON strings containing braces.
 */
function findOutermostJson(text: string): string | null {
	// Find first { or [
	const objStart = text.indexOf("{");
	const arrStart = text.indexOf("[");

	let start: number;
	let openChar: string;
	let closeChar: string;

	if (objStart === -1 && arrStart === -1) return null;

	if (objStart === -1) {
		start = arrStart;
		openChar = "[";
		closeChar = "]";
	} else if (arrStart === -1) {
		start = objStart;
		openChar = "{";
		closeChar = "}";
	} else if (objStart <= arrStart) {
		start = objStart;
		openChar = "{";
		closeChar = "}";
	} else {
		start = arrStart;
		openChar = "[";
		closeChar = "]";
	}

	// Walk forward, tracking depth and string boundaries
	let depth = 0;
	let inString = false;
	let escaped = false;

	for (let i = start; i < text.length; i++) {
		const ch = text.charAt(i);

		if (escaped) {
			escaped = false;
			continue;
		}

		if (ch === "\\") {
			if (inString) escaped = true;
			continue;
		}

		if (ch === '"') {
			inString = !inString;
			continue;
		}

		if (inString) continue;

		if (ch === openChar) {
			depth++;
		} else if (ch === closeChar) {
			depth--;
			if (depth === 0) {
				return text.slice(start, i + 1);
			}
		}
	}

	return null;
}
