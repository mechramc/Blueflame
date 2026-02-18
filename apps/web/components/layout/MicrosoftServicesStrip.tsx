"use client";

import { apiGet } from "@/lib/api-client";
import { useEffect, useState } from "react";

interface ServiceStatus {
	name: string;
	icon: string;
	status: "connected" | "degraded" | "offline";
	detail?: string;
}

const SERVICES: ServiceStatus[] = [
	{ name: "Azure Cosmos DB", icon: "DB", status: "connected" },
	{ name: "Azure OpenAI", icon: "AI", status: "connected", detail: "gpt-4o" },
	{ name: "Microsoft Entra ID", icon: "ID", status: "connected" },
	{ name: "Azure SignalR", icon: "RT", status: "connected" },
	{ name: "GitHub Actions", icon: "CI", status: "connected" },
	{ name: "App Insights", icon: "AP", status: "connected" },
];

const STATUS_COLORS = {
	connected: "bg-emerald-500",
	degraded: "bg-amber-500",
	offline: "bg-red-500",
};

export function MicrosoftServicesStrip() {
	const [services, setServices] = useState<ServiceStatus[]>(SERVICES);
	const [expanded, setExpanded] = useState(false);

	useEffect(() => {
		// Probe health endpoint to set real statuses
		apiGet<{
			cosmos: boolean;
			entra: boolean;
			telemetry: boolean;
		}>("/health")
			.then((health) => {
				setServices((prev) =>
					prev.map((s) => {
						if (s.name === "Azure Cosmos DB") {
							return { ...s, status: health.cosmos ? "connected" : "offline" };
						}
						if (s.name === "Microsoft Entra ID") {
							return {
								...s,
								status: health.entra ? "connected" : "degraded",
								detail: health.entra ? "SSO" : "Dev Mode",
							};
						}
						if (s.name === "App Insights") {
							return { ...s, status: health.telemetry ? "connected" : "offline" };
						}
						return s;
					}),
				);
			})
			.catch(() => {});
	}, []);

	return (
		<div className="border-b border-[--border] bg-[--bg-primary]/60 backdrop-blur-sm">
			<div className="flex items-center gap-1 px-4 py-1 overflow-x-auto">
				<button
					type="button"
					onClick={() => setExpanded(!expanded)}
					className="flex items-center gap-1.5 text-[10px] text-[--text-muted] hover:text-[--text-secondary] transition-colors shrink-0 mr-1"
				>
					<svg
						aria-hidden="true"
						width="12"
						height="12"
						viewBox="0 0 24 24"
						fill="none"
						className="text-blue-400"
					>
						<rect x="1" y="1" width="10" height="10" rx="1" fill="currentColor" fillOpacity="0.8" />
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
					<span className="font-medium">Microsoft Azure</span>
				</button>

				<span className="text-[--border] mx-1">|</span>

				{services.map((service) => (
					<div
						key={service.name}
						className="flex items-center gap-1.5 shrink-0 px-1.5 py-0.5 rounded hover:bg-[--bg-secondary] transition-colors group"
						title={`${service.name}${service.detail ? ` (${service.detail})` : ""} — ${service.status}`}
					>
						<span
							className={`w-1.5 h-1.5 rounded-full ${STATUS_COLORS[service.status]} ${service.status === "connected" ? "animate-pulse" : ""}`}
						/>
						<span className="text-[10px] text-[--text-muted] group-hover:text-[--text-secondary] font-mono">
							{service.icon}
						</span>
						{expanded && (
							<span className="text-[10px] text-[--text-muted] group-hover:text-[--text-secondary]">
								{service.name}
								{service.detail && <span className="text-blue-400/60 ml-1">{service.detail}</span>}
							</span>
						)}
					</div>
				))}

				{!expanded && (
					<span className="text-[10px] text-[--text-muted] ml-1 shrink-0">
						{services.filter((s) => s.status === "connected").length}/{services.length} services
						connected
					</span>
				)}
			</div>
		</div>
	);
}
