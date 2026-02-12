import type { Config } from "tailwindcss";

const config: Config = {
	content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
	theme: {
		extend: {
			colors: {
				bf: {
					primary: "var(--bg-primary)",
					secondary: "var(--bg-secondary)",
					tertiary: "var(--bg-tertiary)",
					border: "var(--border)",
					"border-bright": "var(--border-bright)",
					"text-primary": "var(--text-primary)",
					"text-secondary": "var(--text-secondary)",
					"text-muted": "var(--text-muted)",
					accent: "var(--accent)",
					"accent-glow": "var(--accent-glow)",
					success: "var(--success)",
					warning: "var(--warning)",
					danger: "var(--danger)",
				},
			},
			fontFamily: {
				sans: ["var(--font-inter)", "system-ui", "sans-serif"],
				mono: ["var(--font-jetbrains)", "ui-monospace", "monospace"],
			},
			animation: {
				"pulse-glow": "pulse-glow 2s ease-in-out infinite",
				"modal-blast": "modal-blast 0.25s ease-out forwards",
				"spawn-agent": "spawn-agent 0.3s ease-out forwards",
				"launch-ripple": "launch-ripple 0.6s ease-out forwards",
				"shake-x": "shake-x 0.4s ease-out",
				"slide-in-top": "slide-in-top 0.3s ease-out forwards",
				"flash-red": "flash-red 0.8s ease-out",
				"escalate-pulse": "escalate-pulse 1.5s ease-in-out infinite",
				"badge-pop": "badge-pop 0.35s ease-out forwards",
				"reinforcement-arrive": "reinforcement-arrive 0.4s ease-out forwards",
				"burn-progress": "burn-progress 2s linear infinite",
				"warning-pulse": "warning-pulse 1.5s ease-in-out infinite",
				"freeze-overlay": "freeze-overlay 0.4s ease-out forwards",
				"node-flash": "node-flash 0.6s ease-out",
				"preserved-glow": "preserved-glow 2s ease-in-out infinite",
				"rebuild-pulse": "rebuild-pulse 1s ease-in-out infinite",
				"fade-in": "fade-in 0.3s ease-out forwards",
			},
			backgroundImage: {
				"burn-gradient": "linear-gradient(90deg, #ef4444, #f97316, #ef4444, #f97316)",
			},
			backgroundSize: {
				"200%": "200% 100%",
			},
		},
	},
	plugins: [],
};

export default config;
