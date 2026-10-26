import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "AI Kubernetes Agent | SRE Troubleshooting Platform",
  description: "On-demand AI-powered Kubernetes troubleshooting and root cause analysis platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="light">
      <body className="antialiased bg-[#fbfbfa] text-slate-800 min-h-screen selection:bg-blue-600/20 selection:text-blue-900">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
