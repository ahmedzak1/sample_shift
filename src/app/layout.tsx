import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sample Shift",
  description: "Pull a Sample from a YouTube link, change its key and tempo, and download it.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
