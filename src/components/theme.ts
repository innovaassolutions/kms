import { extendTheme, ThemeConfig, StyleFunctionProps } from "@chakra-ui/react";

const config: ThemeConfig = {
  initialColorMode: "light",
  useSystemColorMode: true,
};

const theme = extendTheme({
  config,
  colors: {
    orange: {
      50: "#FFF7F0",
      100: "#FFE0CC",
      200: "#FFC299",
      300: "#FFA366",
      400: "#FF8533",
      500: "#F25C05", // Main brand orange
      600: "#D94E04",
      700: "#B93F03",
      800: "#993202",
      900: "#7A2602",
    },
    brand: {
      orange: "#F25C05",
    },
  },
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
  components: {
    Button: {
      baseStyle: {
        fontWeight: "bold",
        borderRadius: "md",
      },
      variants: {
        solid: {
          bg: "orange.500",
          color: "white",
          _hover: { bg: "orange.600" },
        },
        outline: {
          color: "orange.500",
          borderColor: "orange.500",
          _hover: { bg: "orange.50" },
        },
      },
    },
    Tag: {
      baseStyle: {
        borderRadius: "full",
      },
    },
  },
});

export default theme;
