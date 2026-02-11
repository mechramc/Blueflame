import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { SplitView } from "./SplitView";

afterEach(() => {
	cleanup();
});

describe("SplitView", () => {
	it("should render left and right panels", () => {
		render(<SplitView left={<div>Left Panel</div>} right={<div>Right Panel</div>} />);
		expect(screen.getByText("Left Panel")).toBeInTheDocument();
		expect(screen.getByText("Right Panel")).toBeInTheDocument();
	});

	it("should render a draggable separator", () => {
		render(<SplitView left={<div>Left</div>} right={<div>Right</div>} />);
		const separator = screen.getByRole("separator");
		expect(separator).toBeInTheDocument();
	});

	it("should apply default left width", () => {
		const { container } = render(
			<SplitView left={<div>Left</div>} right={<div>Right</div>} defaultLeftPercent={30} />,
		);
		const panels = container.querySelectorAll("[style]");
		const leftPanel = panels[0] as HTMLElement;
		expect(leftPanel?.style.width).toBe("30%");
	});
});
