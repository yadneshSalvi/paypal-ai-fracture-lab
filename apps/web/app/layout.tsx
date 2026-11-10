import type { Metadata } from "next";
import type { ReactNode } from "react";
import localFont from "next/font/local";
import { WorkspaceProvider } from "@/components/workspace-provider";
import "./globals.css";

const geist = localFont({ src: "./fonts/geist-latin.woff2", variable: "--font-geist", display: "swap" });
const geistMono = localFont({ src: "./fonts/geist-mono-latin.woff2", variable: "--font-geist-mono", display: "swap" });

export const metadata: Metadata = {
  title: { default: "Fracture Lab — One purchase. One charge.", template: "%s · Fracture Lab" },
  description: "Crash-test a payment integration, understand the fracture, and inspect the proof. A payment reliability observatory for developers and coding agents.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return <html lang="en" className={`${geist.variable} ${geistMono.variable}`}><body><WorkspaceProvider>{children}</WorkspaceProvider></body></html>;
}
