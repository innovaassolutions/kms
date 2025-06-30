import { extendTheme, ThemeConfig, StyleFunctionProps } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  styles: {
    global: (props: StyleFunctionProps) => ({
      body: {
        bg: props.colorMode === "dark" ? "gray.900" : "gray.50",
        color: props.colorMode === "dark" ? "gray.100" : "gray.900",
        transition: "background 0.2s, color 0.2s",
      },
      p: {
        color: props.colorMode === "dark" ? "gray.300" : "gray.700",
      },
      h1: {
        color: props.colorMode === "dark" ? "white" : "gray.900",
      },
      h2: {
        color: props.colorMode === "dark" ? "white" : "gray.900",
      },
      // Add more as needed
    }),
  },
});

export default theme;
