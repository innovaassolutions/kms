"use client";

import { Box } from "@chakra-ui/react";
import Sidebar from "./Sidebar";
import Header from "./Header";
import ChakraProviders from "./ChakraProviders";

const SIDEBAR_WIDTH = 220;
const SIDEBAR_COLLAPSED = 64;
const HEADER_HEIGHT = 72;

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  // For now, default to collapsed padding (matches Sidebar default)
  return (
    <ChakraProviders>
      <Box position="relative" minH="100vh" bg="#181f2a">
        {/* Header - positioned at top */}
        <Header />
        {/* Sidebar - positioned below header */}
        <Box
          position="fixed"
          left={0}
          top={`${HEADER_HEIGHT}px`}
          h={`calc(100vh - ${HEADER_HEIGHT}px)`}
          zIndex={999}
        >
          <Sidebar />
        </Box>
        {/* Main content - positioned below header and to the right of sidebar */}
        <Box
          as="main"
          pl={{ base: `${SIDEBAR_COLLAPSED}px`, md: `${SIDEBAR_COLLAPSED}px` }}
          pt={`${HEADER_HEIGHT}px`}
          minH={`calc(100vh - ${HEADER_HEIGHT}px)`}
          transition="padding-left 0.2s"
          bg="#181f2a"
        >
          {children}
        </Box>
      </Box>
    </ChakraProviders>
  );
} 
