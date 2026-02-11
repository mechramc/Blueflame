"use client";

import Link from "next/link";

const DEMO_PROJECT_ID = "demo-project-1";
const DEMO_RUN_ID = "demo-run-1";

/**
 * Home page — project list with demo project entry.
 * In production, this would fetch from Cosmos DB.
 */
export default function Home() {
	return (
		<div className="min-h-[calc(100vh-44px)] bg-gray-950 p-8">
			<div className="mx-auto max-w-4xl">
				{/* Hero */}
				<div className="mb-12 text-center">
					<h1 className="mb-3 text-4xl font-bold tracking-tight text-gray-100">Blueflame</h1>
					<p className="text-lg text-gray-400">The Governed AI Software Refinery</p>
					<p className="mt-2 text-sm text-gray-500">
						Turn human intent into specs, then execute via an authorized multi-agent swarm
					</p>
				</div>

				{/* Project list */}
				<div className="space-y-3">
					<h2 className="text-sm font-semibold uppercase text-gray-500 tracking-wider">Projects</h2>

					{/* Demo project card */}
					<div className="rounded-lg border border-gray-800 bg-gray-900 p-5 hover:border-gray-700 transition-colors">
						<div className="flex items-start justify-between">
							<div>
								<h3 className="text-lg font-semibold text-gray-100">Demo Project</h3>
								<p className="mt-1 text-sm text-gray-400">
									Full-stack task management app — demonstrating the complete 6-stage refinement
									loop with governed agent execution
								</p>
								<div className="mt-3 flex items-center gap-4 text-xs text-gray-500">
									<span className="flex items-center gap-1">
										<span className="w-2 h-2 rounded-full bg-green-500" />
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
								className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
							>
								Chat + Spec Editor
							</Link>
							<Link
								href={`/project/${DEMO_PROJECT_ID}/run/${DEMO_RUN_ID}`}
								className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
							>
								Run Dashboard
							</Link>
							<Link
								href={`/project/${DEMO_PROJECT_ID}/failures`}
								className="inline-flex items-center gap-1.5 rounded-md bg-gray-800 px-3 py-1.5 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
							>
								Failure Intelligence
							</Link>
						</div>
					</div>
				</div>

				{/* Architecture highlights */}
				<div className="mt-12 grid grid-cols-3 gap-4">
					<FeatureCard
						title="Spec-First"
						description="Immutable specs with SHA-256 hashing. Every change is versioned and traceable."
					/>
					<FeatureCard
						title="Governed Agents"
						description="PlanLock authorization gate. Agents only act within approved scope and budget."
					/>
					<FeatureCard
						title="Failure Intelligence"
						description="ADO/GitHub Actions → root cause analysis → governed remediation with new PlanLock."
					/>
				</div>
			</div>
		</div>
	);
}

function FeatureCard({ title, description }: { title: string; description: string }) {
	return (
		<div className="rounded-lg border border-gray-800 bg-gray-900/50 p-4">
			<h3 className="text-sm font-semibold text-gray-200">{title}</h3>
			<p className="mt-1 text-xs text-gray-500">{description}</p>
		</div>
	);
}
