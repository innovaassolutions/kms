"use client";

import { Box, Heading, Text, Button, Flex, HStack, SimpleGrid } from "@chakra-ui/react";
import Link from "next/link";

export default function KMSHomePage() {
  return (
    <Box minH="100vh" bg="gray.50" p={8}>
      <SimpleGrid columns={{ base: 1, sm: 2, md: 3, lg: 4 }} spacing={6}>
        {[...Array(12)].map((_, i) => (
          <Box
            key={i}
            bg="white"
            borderRadius="lg"
            boxShadow="md"
            p={8}
            display="flex"
            alignItems="center"
            justifyContent="center"
            minH="120px"
          >
            <Text fontWeight="bold" color="gray.500">Placeholder {i + 1}</Text>
          </Box>
        ))}
      </SimpleGrid>
    </Box>
  );
}
