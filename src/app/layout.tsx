import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Footer from "../components/Footer";
import ChakraProviders from "../components/ChakraProviders";
import Sidebar from "../components/Sidebar";
import { Box } from "@chakra-ui/react";
import Header from "../components/Header";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Innovaas Solutions",
  description: "Digital Transformation Agency",
};

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  // For now, default to expanded width. For a fully dynamic layout, you can lift the collapsed state up and pass it to Sidebar.
  // If you want to sync the sidebar state, you can use a context or a global state manager.
  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />
        <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
        <link rel="manifest" href="/site.webmanifest" />
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#ff5a00" />
        <meta name="theme-color" content="#0d1a21" />
      </head>
      <body>
        <ChakraProviders>
          <Header />
          <Sidebar />
          <Box as="main" pl={{ base: `${SIDEBAR_COLLAPSED}px`, md: `${SIDEBAR_WIDTH}px` }} minH="100vh" transition="padding-left 0.2s">
            {children}
            <Footer />
          </Box>
        </ChakraProviders>
      </body>
    </html>
  );
}
