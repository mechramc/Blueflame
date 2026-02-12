import type { ChatMessage } from "@blueflame/shared";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ChatInput } from "./ChatInput";
import { MessageBubble } from "./MessageBubble";
import { TypingIndicator } from "./TypingIndicator";

afterEach(() => {
	cleanup();
});

// ─── MessageBubble ───────────────────────────────────────────

describe("MessageBubble", () => {
	const baseMessage: ChatMessage = {
		id: "msg-1",
		projectId: "proj-1",
		role: "user",
		content: "Hello, world!",
		createdAt: "2026-01-15T10:30:00Z",
	};

	it("should render user message with right alignment", () => {
		render(<MessageBubble message={baseMessage} />);
		expect(screen.getByText("Hello, world!")).toBeInTheDocument();
		// User messages are right-aligned (justify-end)
		const row = screen.getByText("Hello, world!").closest("div[class*='justify-end']");
		expect(row).toBeInTheDocument();
	});

	it("should render agent message with left alignment and markdown", () => {
		const agentMsg: ChatMessage = {
			...baseMessage,
			id: "msg-2",
			role: "agent",
			content: "Here is some **bold** text",
		};
		render(<MessageBubble message={agentMsg} />);
		// Markdown should render bold
		const bold = screen.getByText("bold");
		expect(bold.tagName).toBe("STRONG");
	});

	it("should show streaming pulse animation when streaming", () => {
		const streamingMsg: ChatMessage = {
			...baseMessage,
			id: "msg-stream",
			role: "agent",
			streaming: true,
		};
		const { container } = render(<MessageBubble message={streamingMsg} />);
		const animatedEl = container.querySelector(".animate-pulse");
		expect(animatedEl).toBeInTheDocument();
	});

	it("should display formatted time", () => {
		render(<MessageBubble message={baseMessage} />);
		// Should contain a time element
		const timeEl = screen.getByText(/\d{1,2}:\d{2}/);
		expect(timeEl).toBeInTheDocument();
	});
});

// ─── ChatInput ───────────────────────────────────────────────

describe("ChatInput", () => {
	it("should call onSend when Enter is pressed", () => {
		const onSend = vi.fn();
		render(<ChatInput onSend={onSend} />);

		const textarea = screen.getByPlaceholderText(/describe what you want/i);
		fireEvent.change(textarea, { target: { value: "Test message" } });
		fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

		expect(onSend).toHaveBeenCalledWith("Test message");
	});

	it("should not send on Shift+Enter (allows newline)", () => {
		const onSend = vi.fn();
		render(<ChatInput onSend={onSend} />);

		const textarea = screen.getByPlaceholderText(/describe what you want/i);
		fireEvent.change(textarea, { target: { value: "Test message" } });
		fireEvent.keyDown(textarea, { key: "Enter", shiftKey: true });

		expect(onSend).not.toHaveBeenCalled();
	});

	it("should not send empty messages", () => {
		const onSend = vi.fn();
		render(<ChatInput onSend={onSend} />);

		const textarea = screen.getByPlaceholderText(/describe what you want/i);
		fireEvent.change(textarea, { target: { value: "   " } });
		fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

		expect(onSend).not.toHaveBeenCalled();
	});

	it("should clear input after sending", () => {
		const onSend = vi.fn();
		render(<ChatInput onSend={onSend} />);

		const textarea = screen.getByPlaceholderText(/describe what you want/i) as HTMLTextAreaElement;
		fireEvent.change(textarea, { target: { value: "Hello" } });
		fireEvent.keyDown(textarea, { key: "Enter", shiftKey: false });

		expect(textarea.value).toBe("");
	});

	it("should disable input when disabled prop is true", () => {
		const onSend = vi.fn();
		render(<ChatInput onSend={onSend} disabled />);

		const textarea = screen.getByPlaceholderText(/describe what you want/i);
		expect(textarea).toBeDisabled();
	});

	it("should send on button click", () => {
		const onSend = vi.fn();
		render(<ChatInput onSend={onSend} />);

		const textarea = screen.getByPlaceholderText(/describe what you want/i);
		fireEvent.change(textarea, { target: { value: "Click send" } });

		const button = screen.getByRole("button", { name: /send/i });
		fireEvent.click(button);

		expect(onSend).toHaveBeenCalledWith("Click send");
	});
});

// ─── TypingIndicator ─────────────────────────────────────────

describe("TypingIndicator", () => {
	it("should render typing text", () => {
		render(<TypingIndicator />);
		expect(screen.getByText(/designer is typing/i)).toBeInTheDocument();
	});

	it("should render three animated dots", () => {
		const { container } = render(<TypingIndicator />);
		const dots = container.querySelectorAll(".animate-bounce");
		expect(dots.length).toBe(3);
	});
});
