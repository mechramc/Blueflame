"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

/**
 * Top navigation header — frosted glass style with gradient Blueflame wordmark.
 * Shows contextual breadcrumb nav and connection status.
 */
export function NavHeader() {
	const pathname = usePathname();

	const projectMatch = pathname.match(/\/project\/([^/]+)/);
	const projectId = projectMatch?.[1];
	const runMatch = pathname.match(/\/run\/([^/]+)/);
	const runId = runMatch?.[1];

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

			{/* Right: connection status */}
			<div className="flex items-center gap-2">
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
