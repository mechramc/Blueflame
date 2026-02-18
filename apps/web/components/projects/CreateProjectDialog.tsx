"use client";

import { type FormEvent, useEffect, useState } from "react";

interface CreateProjectDialogProps {
	open: boolean;
	onClose: () => void;
	onSubmit: (name: string, description: string) => Promise<void>;
}

const AZURE_SERVICES = [
	{ id: "cosmos", name: "Azure Cosmos DB", desc: "NoSQL database", icon: "DB", delay: 0 },
	{ id: "openai", name: "Azure OpenAI", desc: "GPT-4o agents", icon: "AI", delay: 400 },
	{ id: "entra", name: "Microsoft Entra ID", desc: "Identity & RBAC", icon: "ID", delay: 800 },
	{ id: "signalr", name: "Azure SignalR", desc: "Real-time events", icon: "RT", delay: 1200 },
	{ id: "github", name: "GitHub Actions", desc: "CI/CD pipeline", icon: "CI", delay: 1600 },
	{ id: "insights", name: "App Insights", desc: "Telemetry", icon: "AP", delay: 2000 },
];

type Step = "details" | "infra" | "provisioning";

export function CreateProjectDialog({ open, onClose, onSubmit }: CreateProjectDialogProps) {
	const [name, setName] = useState("");
	const [description, setDescription] = useState("");
	const [step, setStep] = useState<Step>("details");
	const [, setSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [provisionedServices, setProvisionedServices] = useState<Set<string>>(new Set());

	// Reset on close
	useEffect(() => {
		if (!open) {
			setStep("details");
			setProvisionedServices(new Set());
		}
	}, [open]);

	if (!open) return null;

	async function handleDetailsNext(e: FormEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		setStep("infra");
	}

	function handleSelectInfra(choice: "azure" | "local") {
		if (choice === "local") {
			doCreate();
			return;
		}
		// Azure: show provisioning animation
		setStep("provisioning");
		const completed = new Set<string>();
		for (const svc of AZURE_SERVICES) {
			setTimeout(() => {
				completed.add(svc.id);
				setProvisionedServices(new Set(completed));
				// After last service, create project
				if (completed.size === AZURE_SERVICES.length) {
					setTimeout(() => doCreate(), 600);
				}
			}, svc.delay + 300);
		}
	}

	async function doCreate() {
		setSubmitting(true);
		setError(null);
		try {
			await onSubmit(name.trim(), description.trim());
			setName("");
			setDescription("");
			setStep("details");
			onClose();
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to create project");
			setStep("infra");
		} finally {
			setSubmitting(false);
		}
	}

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			<div className="absolute inset-0 bg-black/60" onClick={onClose} onKeyDown={undefined} />
			<div
				className="relative z-10 w-full max-w-lg rounded-lg border border-[--border-bright] bg-[--bg-secondary] p-6 shadow-xl"
				data-testid="create-project-dialog"
			>
				{/* Step indicator */}
				<div className="flex items-center gap-2 mb-5">
					{["Details", "Infrastructure", "Provision"].map((label, i) => {
						const stepIndex = ["details", "infra", "provisioning"].indexOf(step);
						const isActive = i === stepIndex;
						const isDone = i < stepIndex;
						return (
							<div key={label} className="flex items-center gap-2">
								{i > 0 && (
									<div className={`h-px w-6 ${isDone ? "bg-blue-400" : "bg-[--border]"}`} />
								)}
								<div
									className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-medium ${isActive ? "bg-blue-500/20 text-blue-400" : isDone ? "bg-emerald-500/20 text-emerald-400" : "text-[--text-muted]"}`}
								>
									{isDone ? "\u2713" : i + 1} {label}
								</div>
							</div>
						);
					})}
				</div>

				{/* Step 1: Project Details */}
				{step === "details" && (
					<form onSubmit={handleDetailsNext} className="space-y-4">
						<h2 className="text-lg font-semibold text-[--text-primary]">New Project</h2>
						<div>
							<label
								htmlFor="project-name"
								className="block text-xs font-medium text-[--text-secondary] mb-1"
							>
								Project Name
							</label>
							<input
								id="project-name"
								data-testid="project-name-input"
								type="text"
								value={name}
								onChange={(e) => setName(e.target.value)}
								placeholder="e.g., Backend Refactor v3"
								className="w-full rounded border border-[--border] bg-[--bg-primary] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] focus:outline-none"
								required
							/>
						</div>
						<div>
							<label
								htmlFor="project-desc"
								className="block text-xs font-medium text-[--text-secondary] mb-1"
							>
								Description
							</label>
							<textarea
								id="project-desc"
								value={description}
								onChange={(e) => setDescription(e.target.value)}
								placeholder="What is this project about?"
								rows={3}
								className="w-full rounded border border-[--border] bg-[--bg-primary] px-3 py-2 text-sm text-[--text-primary] placeholder:text-[--text-muted] focus:border-[--accent] focus:outline-none resize-none"
							/>
						</div>
						{error && <p className="text-xs text-red-400">{error}</p>}
						<div className="flex justify-end gap-2 pt-2">
							<button
								type="button"
								onClick={onClose}
								className="rounded px-3 py-1.5 text-sm text-[--text-secondary] hover:text-[--text-primary] hover:bg-[--bg-tertiary] transition-colors"
							>
								Cancel
							</button>
							<button
								type="submit"
								disabled={!name.trim()}
								data-testid="create-project-submit-button"
								className="rounded border border-[--accent] bg-[--accent]/10 px-3 py-1.5 text-sm font-medium text-blue-400 hover:bg-[--accent]/20 transition-colors disabled:opacity-50"
							>
								Next: Choose Infrastructure
							</button>
						</div>
					</form>
				)}

				{/* Step 2: Infrastructure Selection */}
				{step === "infra" && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-[--text-primary]">Choose Infrastructure</h2>
						<p className="text-xs text-[--text-secondary]">
							Select the infrastructure stack for{" "}
							<span className="font-semibold text-[--text-primary]">{name}</span>
						</p>
						<div className="grid grid-cols-2 gap-3">
							{/* Azure Option */}
							<button
								type="button"
								onClick={() => handleSelectInfra("azure")}
								className="group relative rounded-lg border-2 border-blue-500/30 bg-gradient-to-br from-blue-500/5 to-blue-600/10 p-4 text-left hover:border-blue-500/60 hover:from-blue-500/10 hover:to-blue-600/20 transition-all"
							>
								<div className="flex items-center gap-2 mb-2">
									<svg
										aria-hidden="true"
										width="20"
										height="20"
										viewBox="0 0 24 24"
										fill="none"
										className="text-blue-400"
									>
										<rect
											x="1"
											y="1"
											width="10"
											height="10"
											rx="1"
											fill="currentColor"
											fillOpacity="0.8"
										/>
										<rect
											x="13"
											y="1"
											width="10"
											height="10"
											rx="1"
											fill="currentColor"
											fillOpacity="0.6"
										/>
										<rect
											x="1"
											y="13"
											width="10"
											height="10"
											rx="1"
											fill="currentColor"
											fillOpacity="0.6"
										/>
										<rect
											x="13"
											y="13"
											width="10"
											height="10"
											rx="1"
											fill="currentColor"
											fillOpacity="0.4"
										/>
									</svg>
									<span className="text-sm font-semibold text-blue-400">Microsoft Azure</span>
								</div>
								<p className="text-[10px] text-[--text-muted] leading-relaxed">
									Cosmos DB + Azure OpenAI + Entra ID + SignalR + GitHub Actions + App Insights
								</p>
								<div className="absolute top-2 right-2 text-[9px] font-bold text-blue-400/60 bg-blue-500/10 px-1.5 py-0.5 rounded">
									RECOMMENDED
								</div>
							</button>
							{/* Local Option */}
							<button
								type="button"
								onClick={() => handleSelectInfra("local")}
								className="rounded-lg border-2 border-[--border] bg-[--bg-primary] p-4 text-left hover:border-[--text-muted] transition-all"
							>
								<div className="flex items-center gap-2 mb-2">
									<span className="w-5 h-5 flex items-center justify-center text-[--text-muted] text-sm">
										&gt;_
									</span>
									<span className="text-sm font-semibold text-[--text-secondary]">
										Local / Custom
									</span>
								</div>
								<p className="text-[10px] text-[--text-muted] leading-relaxed">
									In-memory storage, local models. No cloud services required.
								</p>
							</button>
						</div>
						<div className="flex justify-start pt-1">
							<button
								type="button"
								onClick={() => setStep("details")}
								className="text-xs text-[--text-muted] hover:text-[--text-secondary] transition-colors"
							>
								&larr; Back
							</button>
						</div>
					</div>
				)}

				{/* Step 3: Provisioning Animation */}
				{step === "provisioning" && (
					<div className="space-y-4">
						<h2 className="text-lg font-semibold text-[--text-primary]">
							Provisioning Azure Services
						</h2>
						<p className="text-xs text-[--text-secondary]">
							Setting up Microsoft Azure infrastructure for{" "}
							<span className="font-semibold text-[--text-primary]">{name}</span>
						</p>
						<div className="space-y-2">
							{AZURE_SERVICES.map((svc) => {
								const done = provisionedServices.has(svc.id);
								const isNext = !done && provisionedServices.size === AZURE_SERVICES.indexOf(svc);
								return (
									<div
										key={svc.id}
										className={`flex items-center gap-3 rounded border px-3 py-2 transition-all duration-500 ${done ? "border-emerald-500/30 bg-emerald-500/5" : isNext ? "border-blue-500/30 bg-blue-500/5" : "border-[--border] bg-[--bg-primary]"}`}
									>
										<div
											className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold ${done ? "bg-emerald-500/20 text-emerald-400" : isNext ? "bg-blue-500/20 text-blue-400 animate-pulse" : "bg-[--bg-tertiary] text-[--text-muted]"}`}
										>
											{done ? "\u2713" : svc.icon}
										</div>
										<div className="flex-1">
											<div
												className={`text-xs font-medium ${done ? "text-emerald-400" : isNext ? "text-blue-400" : "text-[--text-muted]"}`}
											>
												{svc.name}
											</div>
											<div className="text-[10px] text-[--text-muted]">
												{done ? "Connected" : isNext ? "Connecting..." : svc.desc}
											</div>
										</div>
										{isNext && (
											<div className="w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
										)}
									</div>
								);
							})}
						</div>
						{provisionedServices.size === AZURE_SERVICES.length && (
							<div className="text-center py-2">
								<p className="text-xs text-emerald-400 font-medium animate-pulse">
									All services connected. Creating project...
								</p>
							</div>
						)}
					</div>
				)}
			</div>
		</div>
	);
}
