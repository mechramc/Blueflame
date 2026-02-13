import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { AuthWrapper } from "@/components/auth/AuthWrapper";
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
					<div className="flex flex-col min-h-screen">
						<NavHeader />
						<main className="flex-1 animate-fade-in">{children}</main>
					</div>
				</AuthWrapper>
			</body>
		</html>
	);
}
