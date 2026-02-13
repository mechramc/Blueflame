"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Top navigation header — frosted glass style with gradient Blueflame wordmark.
 * Shows contextual breadcrumb nav and connection status.
 * Persists last runId per project so the Run link remains accessible from Spec page.
 */
export function NavHeader() {
	const pathname = usePathname();

	const projectMatch = pathname.match(/\/project\/([^/]+)/);
	const projectId = projectMatch?.[1];
	const runMatch = pathname.match(/\/run\/([^/]+)/);
	const urlRunId = runMatch?.[1];
	const [storedRunId, setStoredRunId] = useState<string | null>(null);

	// Persist last runId per project in localStorage
	useEffect(() => {
		if (projectId && urlRunId) {
			localStorage.setItem(`bf-last-run-${projectId}`, urlRunId);
			setStoredRunId(urlRunId);
		} else if (projectId) {
			setStoredRunId(localStorage.getItem(`bf-last-run-${projectId}`));
		}
	}, [projectId, urlRunId]);

	const runId = urlRunId ?? storedRunId;

	return (
		<header className="sticky top-0 z-40 border-b border-[--border] bg-[--bg-primary]/80 backdrop-blur-xl px-4 py-2 flex items-center justify-between">
			{/* Left: brand + nav */}
			<div className="flex items-center gap-5">
				<Link href="/" className="flex items-center gap-2">
					<span className="text-sm font-semibold tracking-tight bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
						Blueflame
					</span>
				</Link>

				<nav className="flex items-center gap-0.5 text-xs">
					<NavItem href="/" label="Projects" active={pathname === "/"} />
					{projectId && (
						<>
							<Separator />
							<NavItem
								href={`/project/${projectId}`}
								label="Spec"
								active={/\/project\/[^/]+$/.test(pathname)}
							/>
							{runId && (
								<>
									<Separator />
									<NavItem
										href={`/project/${projectId}/run/${runId}`}
										label="Run"
										active={/\/run\/[^/]+$/.test(pathname)}
									/>
								</>
							)}
							<Separator />
							<NavItem
								href={`/project/${projectId}/failures`}
								label="Failures"
								active={/\/failures$/.test(pathname)}
							/>
						</>
					)}
				</nav>
			</div>

			{/* Right: enterprise links + connection status */}
			<div className="flex items-center gap-3">
				<nav className="flex items-center gap-0.5 text-xs border-r border-[--border] pr-3 mr-1">
					<NavItem href="/compliance" label="Compliance" active={pathname === "/compliance"} />
					<NavItem href="/chargeback" label="Chargeback" active={pathname === "/chargeback"} />
				</nav>
				<span className="flex items-center gap-1.5 text-[10px] text-[--text-muted]">
					<span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
					Connected
				</span>
			</div>
		</header>
	);
}

function NavItem({ href, label, active }: { href: string; label: string; active: boolean }) {
	return (
		<Link
			href={href}
			className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
				active
					? "bg-[--bg-tertiary] text-[--text-primary]"
					: "text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary]/50"
			}`}
		>
			{label}
		</Link>
	);
}

function Separator() {
	return <span className="text-[--text-muted] text-xs">/</span>;
}
