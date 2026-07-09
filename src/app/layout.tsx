import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopper Intelligence Engine",
  description:
    "LLM-powered ecommerce personalization rules engine — classify shoppers in real time",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
