import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
import { AzureToastProvider } from "@/components/layout/AzureToastProvider";
import { MicrosoftServicesStrip } from "@/components/layout/MicrosoftServicesStrip";
import { NavHeader } from "@/components/layout/NavHeader";

const inter = Inter({
	subsets: ["latin"],
	variable: "--font-inter",
	display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
	subsets: ["latin"],
	variable: "--font-jetbrains",
	display: "swap",
});

export const metadata: Metadata = {
	title: "Blueflame",
	description: "The Governed AI Software Refinery",
};

export default function RootLayout({
	children,
}: {
	children: React.ReactNode;
}) {
	return (
		<html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
			<body className="min-h-screen font-sans antialiased">
				<AuthWrapper>
					<AzureToastProvider>
						<div className="flex flex-col h-screen overflow-hidden">
							<NavHeader />
							<MicrosoftServicesStrip />
							<main className="flex-1 min-h-0 animate-fade-in">{children}</main>
						</div>
					</AzureToastProvider>
				</AuthWrapper>
			</body>
		</html>
	);
}
