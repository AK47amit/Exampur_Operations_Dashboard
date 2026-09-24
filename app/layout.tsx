import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "EXAMPUR Prayagraj | Operations Dashboard",
  description:
    "EXAMPUR Prayagraj centre dashboard for admissions, student ID cards, QR attendance, fees and timetables.",
  other: {
    "codex-preview": "development",
  },
  icons: { icon: "/favicon.svg", shortcut: "/favicon.svg" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-IN">
      <body className="antialiased">{children}</body>
    </html>
  );
}
