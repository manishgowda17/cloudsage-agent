import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "ClusterSage | Autonomous Kubernetes SRE & Observability Platform",
  description: "Next-generation autonomous Kubernetes troubleshooting, root cause analysis, and memory-grounded reliability platform.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased bg-[#070a11] text-slate-200 min-h-screen selection:bg-cyan-500/25 selection:text-cyan-200">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
