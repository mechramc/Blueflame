"use client";

import { createContext, useCallback, useContext, useState } from "react";

interface AzureToast {
	id: number;
	service: string;
	icon: string;
	message: string;
	color: string;
}

interface AzureToastContextType {
	showToast: (service: string, icon: string, message: string, color?: string) => void;
}

const AzureToastContext = createContext<AzureToastContextType>({
	showToast: () => {},
});

export function useAzureToast() {
	return useContext(AzureToastContext);
}

let toastIdCounter = 0;

export function AzureToastProvider({ children }: { children: React.ReactNode }) {
	const [toasts, setToasts] = useState<AzureToast[]>([]);

	const showToast = useCallback(
		(service: string, icon: string, message: string, color = "blue") => {
			toastIdCounter += 1;
			const id = toastIdCounter;
			const toast: AzureToast = { id, service, icon, message, color };
			setToasts((prev) => [...prev.slice(-4), toast]);
			setTimeout(() => {
				setToasts((prev) => prev.filter((t) => t.id !== id));
			}, 3000);
		},
		[],
	);

	return (
		<AzureToastContext.Provider value={{ showToast }}>
			{children}
			{/* Toast container */}
			<div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 pointer-events-none">
				{toasts.map((toast) => (
					<div
						key={toast.id}
						className="pointer-events-auto animate-slide-in-right flex items-center gap-2.5 rounded-lg border border-[--border-bright] bg-[--bg-secondary]/95 backdrop-blur-sm px-4 py-2.5 shadow-lg min-w-[280px]"
					>
						<div
							className={`w-7 h-7 rounded flex items-center justify-center text-[10px] font-bold shrink-0 ${
								toast.color === "emerald"
									? "bg-emerald-500/20 text-emerald-400"
									: toast.color === "purple"
										? "bg-purple-500/20 text-purple-400"
										: toast.color === "amber"
											? "bg-amber-500/20 text-amber-400"
											: "bg-blue-500/20 text-blue-400"
							}`}
						>
							{toast.icon}
						</div>
						<div className="flex-1 min-w-0">
							<div className="text-[10px] font-semibold text-blue-400/80">{toast.service}</div>
							<div className="text-xs text-[--text-secondary] truncate">{toast.message}</div>
						</div>
					</div>
				))}
			</div>
		</AzureToastContext.Provider>
	);
}
