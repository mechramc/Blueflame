"use client";

import Link from "next/link";
import { useCallback, useState } from "react";

const DEMO_PROJECT_ID = "demo-project-1";
const DEMO_RUN_ID = "demo-run-1";
const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";

export default function Home() {
	const [seeding, setSeeding] = useState(false);
	const [seedResult, setSeedResult] = useState<string | null>(null);

	const handleSeed = useCallback(async () => {
		setSeeding(true);
		setSeedResult(null);
		try {
			const res = await fetch(`${API_BASE}/api/demo/seed`, { method: "POST" });
			if (res.ok) {
				setSeedResult("Demo data seeded successfully");
			} else {
				setSeedResult("Seed failed — is the API running?");
			}
		} catch {
			setSeedResult("Cannot reach API — start it with npm run dev in apps/api");
		} finally {
			setSeeding(false);
		}
	}, []);

	return (
		<div className="min-h-[calc(100vh-44px)] p-8">
			<div className="mx-auto max-w-4xl">
				{/* Hero */}
				<div className="mb-16 text-center">
					<h1 className="mb-3 text-5xl font-semibold tracking-[-0.025em] bg-gradient-to-r from-blue-400 via-blue-500 to-blue-600 bg-clip-text text-transparent">
						Blueflame
					</h1>
					<p className="text-base text-[--text-secondary]">The Governed AI Software Refinery</p>
					<p className="mt-2 text-sm text-[--text-muted]">
						Turn human intent into specs, then execute via an authorized multi-agent swarm
					</p>

					{/* Seed button */}
					<div className="mt-6">
						<button
							type="button"
							onClick={handleSeed}
							disabled={seeding}
							className="inline-flex items-center gap-2 rounded border border-[--border-bright] bg-[--bg-secondary] px-4 py-2 text-sm font-medium text-[--text-primary] transition-colors hover:bg-[--bg-tertiary] hover:border-[--accent] disabled:opacity-50"
						>
							{seeding ? "Seeding..." : "Seed Demo Data"}
						</button>
						{seedResult && <p className="mt-2 text-xs text-[--text-muted]">{seedResult}</p>}
					</div>
				</div>

				{/* Project list */}
				<div className="space-y-3">
					<h2 className="text-xs font-semibold uppercase text-[--text-muted] tracking-wider">
						Projects
					</h2>

					{/* Demo project card */}
					<div className="rounded border border-[--border] bg-[--bg-secondary] p-4 hover:border-[--border-bright] transition-colors group relative overflow-hidden">
						{/* Left accent border */}
						<div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[--accent]" />

						<div className="pl-3">
							<div className="flex items-start justify-between">
								<div>
									<h3 className="text-base font-semibold text-[--text-primary]">Demo Project</h3>
									<p className="mt-1 text-sm text-[--text-secondary]">
										Full-stack task management app — complete 6-stage refinement loop
									</p>
									<div className="mt-2 flex items-center gap-4 text-xs text-[--text-muted] font-mono">
										<span className="flex items-center gap-1.5">
											<span className="w-1.5 h-1.5 rounded-full bg-[--success]" />
											Active
										</span>
										<span>5 agents</span>
										<span>7 workflows</span>
									</div>
								</div>
							</div>

							{/* Quick links */}
							<div className="mt-4 flex flex-wrap gap-2">
								<Link
									href={`/project/${DEMO_PROJECT_ID}`}
									className="inline-flex items-center gap-1.5 rounded border border-[--accent] bg-[--accent]/10 px-3 py-1.5 text-xs font-medium text-blue-400 hover:bg-[--accent]/20 transition-colors"
								>
									Chat + Spec Editor
								</Link>
								<Link
									href={`/project/${DEMO_PROJECT_ID}/run/${DEMO_RUN_ID}`}
									className="inline-flex items-center gap-1.5 rounded border border-[--border-bright] px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-bright] hover:bg-[--bg-tertiary] transition-colors"
								>
									Run Dashboard
								</Link>
								<Link
									href={`/project/${DEMO_PROJECT_ID}/failures`}
									className="inline-flex items-center gap-1.5 rounded border border-[--border-bright] px-3 py-1.5 text-xs font-medium text-[--text-secondary] hover:text-[--text-primary] hover:border-[--border-bright] hover:bg-[--bg-tertiary] transition-colors"
								>
									Failure Intelligence
								</Link>
							</div>
						</div>
					</div>
				</div>

				{/* Architecture highlights */}
				<div className="mt-12 grid grid-cols-3 gap-3">
					<FeatureCard title="Spec-First" icon="S" />
					<FeatureCard title="Governed Agents" icon="G" />
					<FeatureCard title="Failure Intelligence" icon="F" />
				</div>
			</div>
		</div>
	);
}

function FeatureCard({ title, icon }: { title: string; icon: string }) {
	return (
		<div className="rounded border border-[--border] bg-[--bg-secondary]/50 p-3 flex items-center gap-3">
			<span className="flex h-7 w-7 shrink-0 items-center justify-center rounded bg-[--accent]/10 text-xs font-semibold text-blue-400 font-mono">
				{icon}
			</span>
			<span className="text-xs font-medium text-[--text-secondary]">{title}</span>
		</div>
	);
}
