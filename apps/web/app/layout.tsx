import type { Metadata } from "next";
import "./globals.css";
import { NavHeader } from "@/components/layout/NavHeader";

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
		<html lang="en">
			<body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
				<div className="flex flex-col min-h-screen">
					<NavHeader />
					<main className="flex-1">{children}</main>
				</div>
			</body>
		</html>
	);
}
