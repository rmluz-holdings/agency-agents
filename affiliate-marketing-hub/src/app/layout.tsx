import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const SITE_NAME = "StackPicks";
const SITE_DESCRIPTION =
  "Hand-tested, high-ticket tools for people who build online businesses. Independent reviews, honest pros and cons, and clearly disclosed affiliate picks.";

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} · The high-ticket tool stack we'd actually pay for`,
    template: `%s · ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  keywords: ["software reviews", "marketing tools", "hosting", "AI tools", "affiliate picks", "SaaS comparison"],
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    title: `${SITE_NAME} · Hand-tested tools for online businesses`,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: `${SITE_NAME} · Hand-tested tools for online businesses`,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
};

/**
 * Runs before hydration so the correct theme class is present on first paint.
 * Mirrors the logic in <ThemeToggle/>: explicit choice in localStorage wins,
 * otherwise fall back to the OS preference.
 */
const THEME_BOOT_SCRIPT = `(function(){try{var t=localStorage.getItem("amh:theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);if(d){document.documentElement.classList.add("dark")}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-full flex-col bg-background text-foreground">
        <SiteHeader />
        <main className="flex-1">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
