import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ontario Knowledge Test",
  description: "Ontario G1 and M1 licence practice tests",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
