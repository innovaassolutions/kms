import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import ClientLayout from "../components/ClientLayout";
import { ColorModeScript } from "@chakra-ui/react";

export const metadata: Metadata = {
  title: "NovaKMS | AI-Powered Knowledge Management System",
  description:
    "Enterprise-grade knowledge management with AI. Process documents, audio, and video. Semantic search, RAG-powered chat with citations, and intelligent onboarding — all in one platform.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon-16x16.png",
    apple: "/apple-touch-icon.png",
  },
  metadataBase: new URL("https://novakms.innovaas.co"),
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "NovaKMS | AI-Powered Knowledge Management System",
    description:
      "Enterprise-grade knowledge management with AI. Process documents, audio, and video. Semantic search, RAG-powered chat with citations, and intelligent onboarding — all in one platform.",
    url: "https://novakms.innovaas.co",
    siteName: "NovaKMS",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "NovaKMS | AI-Powered Knowledge Management System",
    description:
      "Enterprise-grade knowledge management with AI. Process documents, audio, and video. Semantic search, RAG-powered chat with citations, and intelligent onboarding — all in one platform.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <ColorModeScript initialColorMode="light" />
        <link rel="manifest" href="/site.webmanifest" />
        <meta name="theme-color" content="#0d1a21" />
      </head>
      <Script
        id="reb2b-analytics"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `!function(key) {if (window.reb2b) return;window.reb2b = {loaded: true};var s = document.createElement("script");s.async = true;s.src = "https://ddwl4m2hdecbv.cloudfront.net/b/" + key + "/" + key + ".js.gz";document.getElementsByTagName("script")[0].parentNode.insertBefore(s, document.getElementsByTagName("script")[0]);}("GNLKQH7W8R6Q");`,
        }}
      />
      <Script
        src="https://analytics.innovaas.co/script.js"
        data-website-id="6342c379-c6a4-47d7-877b-e351404c73a1"
        strategy="afterInteractive"
      />
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
} 