import { SpecStatus } from "@blueflame/shared";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { SpecActions } from "./SpecActions";
import { SpecStatusBadge } from "./SpecStatusBadge";

// Mock next/navigation (SpecActions uses useRouter)
vi.mock("next/navigation", () => ({
	useRouter: () => ({
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
	}),
}));

// Mock api-client (SpecActions uses apiGet to check existing runs)
vi.mock("@/lib/api-client", () => ({
	apiGet: vi.fn().mockResolvedValue({ runs: [] }),
	apiPost: vi.fn().mockResolvedValue({}),
}));

afterEach(() => {
	cleanup();
});

// ─── SpecStatusBadge ─────────────────────────────────────────

describe("SpecStatusBadge", () => {
	it("should render DRAFT status", () => {
		render(<SpecStatusBadge status={SpecStatus.Draft} />);
		expect(screen.getByText("DRAFT")).toBeInTheDocument();
	});

	it("should render ACCEPTED status with blue styling", () => {
		const { container } = render(<SpecStatusBadge status={SpecStatus.Accepted} />);
		expect(screen.getByText("ACCEPTED")).toBeInTheDocument();
		const badge = container.querySelector("[class*='text-blue']");
		expect(badge).toBeInTheDocument();
	});

	it("should render FROZEN status with green styling", () => {
		const { container } = render(<SpecStatusBadge status={SpecStatus.Frozen} />);
		expect(screen.getByText("FROZEN")).toBeInTheDocument();
		const badge = container.querySelector("[class*='text-emerald']");
		expect(badge).toBeInTheDocument();
	});
});

// ─── SpecActions ─────────────────────────────────────────────

const baseProps = {
	projectId: "proj-1",
	specId: "spec-1",
	onAccept: vi.fn(),
	onFreeze: vi.fn(),
	onGenerateSpec: vi.fn(),
};

describe("SpecActions", () => {
	it("should show Accept and Regenerate buttons for DRAFT status", () => {
		render(
			<SpecActions
				{...baseProps}
				status={SpecStatus.Draft}
				onAccept={vi.fn()}
				onFreeze={vi.fn()}
				onGenerateSpec={vi.fn()}
			/>,
		);
		expect(screen.getByText("Accept")).toBeInTheDocument();
		expect(screen.getByText("Regenerate")).toBeInTheDocument();
	});

	it("should call onAccept when Accept clicked", () => {
		const onAccept = vi.fn();
		render(
			<SpecActions
				{...baseProps}
				status={SpecStatus.Draft}
				onAccept={onAccept}
				onFreeze={vi.fn()}
				onGenerateSpec={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("Accept"));
		expect(onAccept).toHaveBeenCalledOnce();
	});

	it("should show Freeze button for ACCEPTED status", () => {
		render(
			<SpecActions
				{...baseProps}
				status={SpecStatus.Accepted}
				onAccept={vi.fn()}
				onFreeze={vi.fn()}
				onGenerateSpec={vi.fn()}
			/>,
		);
		expect(screen.getByText("Freeze")).toBeInTheDocument();
	});

	it("should call onFreeze when Freeze clicked", () => {
		const onFreeze = vi.fn();
		render(
			<SpecActions
				{...baseProps}
				status={SpecStatus.Accepted}
				onAccept={vi.fn()}
				onFreeze={onFreeze}
				onGenerateSpec={vi.fn()}
			/>,
		);
		fireEvent.click(screen.getByText("Freeze"));
		expect(onFreeze).toHaveBeenCalledOnce();
	});

	it("should show frozen message for FROZEN status", async () => {
		render(
			<SpecActions
				{...baseProps}
				status={SpecStatus.Frozen}
				onAccept={vi.fn()}
				onFreeze={vi.fn()}
				onGenerateSpec={vi.fn()}
			/>,
		);
		await waitFor(() => {
			expect(screen.getByText(/frozen/i)).toBeInTheDocument();
		});
	});

	it("should disable buttons when disabled prop is true", () => {
		render(
			<SpecActions
				{...baseProps}
				status={SpecStatus.Draft}
				onAccept={vi.fn()}
				onFreeze={vi.fn()}
				onGenerateSpec={vi.fn()}
				disabled
			/>,
		);
		const acceptBtn = screen.getByText("Accept");
		expect(acceptBtn).toBeDisabled();
	});
});
