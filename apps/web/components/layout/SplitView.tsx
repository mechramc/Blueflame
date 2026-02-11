"use client";

import { type MouseEvent, useCallback, useRef, useState } from "react";

interface SplitViewProps {
	left: React.ReactNode;
	right: React.ReactNode;
	/** Initial left panel width as percentage (default: 40) */
	defaultLeftPercent?: number;
	/** Minimum panel width in pixels (default: 300) */
	minWidth?: number;
}

/**
 * SplitView — resizable horizontal split layout with draggable divider.
 */
export function SplitView({
	left,
	right,
	defaultLeftPercent = 40,
	minWidth = 300,
}: SplitViewProps) {
	const [leftPercent, setLeftPercent] = useState(defaultLeftPercent);
	const containerRef = useRef<HTMLDivElement>(null);
	const dragging = useRef(false);

	const handleMouseDown = useCallback(
		(e: MouseEvent) => {
			e.preventDefault();
			dragging.current = true;

			const handleMouseMove = (moveEvent: globalThis.MouseEvent) => {
				if (!dragging.current || !containerRef.current) return;
				const rect = containerRef.current.getBoundingClientRect();
				const x = moveEvent.clientX - rect.left;
				const percent = (x / rect.width) * 100;
				const minPercent = (minWidth / rect.width) * 100;
				const maxPercent = 100 - minPercent;
				setLeftPercent(Math.min(maxPercent, Math.max(minPercent, percent)));
			};

			const handleMouseUp = () => {
				dragging.current = false;
				document.removeEventListener("mousemove", handleMouseMove);
				document.removeEventListener("mouseup", handleMouseUp);
			};

			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		},
		[minWidth],
	);

	return (
		<div ref={containerRef} className="flex h-full">
			<div style={{ width: `${leftPercent}%` }} className="h-full overflow-hidden">
				{left}
			</div>
			{/* Draggable divider */}
			<div
				onMouseDown={handleMouseDown}
				role="separator"
				aria-orientation="vertical"
				tabIndex={0}
				className="flex w-1 cursor-col-resize items-center bg-gray-800 transition-colors hover:bg-blue-600"
			/>
			<div style={{ width: `${100 - leftPercent}%` }} className="h-full overflow-hidden">
				{right}
			</div>
		</div>
	);
}
