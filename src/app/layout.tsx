import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";

export const metadata: Metadata = {
  title: "Skylark Business Intelligence",
  description:
    "Founder-ready answers from live monday.com Deals and Work Orders data.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>{children}</body>
      <Script id="skylark-theme" strategy="beforeInteractive">
        {`try {
          var saved = localStorage.getItem("skylark-theme");
          var theme = saved === "light" || saved === "dark"
            ? saved
            : (matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
          document.documentElement.dataset.theme = theme;
          document.documentElement.style.colorScheme = theme;
        } catch (_) {
          document.documentElement.dataset.theme = "dark";
          document.documentElement.style.colorScheme = "dark";
        }`}
      </Script>
    </html>
  );
}

