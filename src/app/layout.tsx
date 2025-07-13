import type { Metadata } from "next";
import "./globals.css";
import ClientLayout from "../components/ClientLayout";
import { ColorModeScript } from "@chakra-ui/react";

export const metadata: Metadata = {
  title: "Innovaas Solutions",
  description: "Digital Transformation Agency",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon-16x16.png',
    apple: '/apple-touch-icon.png',
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
      <body suppressHydrationWarning>
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
} 