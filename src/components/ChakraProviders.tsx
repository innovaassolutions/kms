"use client";
import { ChakraProvider, ColorModeScript } from "@chakra-ui/react";
import { CacheProvider } from '@emotion/react';
import { ReactNode } from "react";
import theme from "./theme";
import { emotionCache } from "./emotionCache";

export default function ChakraProviders({ children }: { children: ReactNode }) {
  return (
    <CacheProvider value={emotionCache}>
      <ChakraProvider theme={theme}>
        <ColorModeScript initialColorMode={theme.config.initialColorMode} />
        {children}
      </ChakraProvider>
    </CacheProvider>
  );
}
