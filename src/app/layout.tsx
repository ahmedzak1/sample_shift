import type { Metadata } from "next";
import { Archivo } from "next/font/google";
import "./globals.css";

// Archivo's width axis gives the key names and tempos their expanded, chart-like cut.
const archivo = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-archivo", display: "swap" });

export const metadata: Metadata = {
  title: "Sample Shift",
  description: "Pull a Sample from a YouTube link, change its key and tempo, and download it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={archivo.variable}>
      <body>{children}</body>
    </html>
  );
}
