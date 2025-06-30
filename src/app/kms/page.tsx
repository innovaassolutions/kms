"use client";

import { Box, Heading, Text, Button, Flex } from "@chakra-ui/react";
import Link from "next/link";

export default function KMSHomePage() {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box p={8} bg="white" borderRadius="xl" boxShadow="lg" textAlign="center">
        <Heading mb={4}>Welcome to the Knowledge Management System (KMS)</Heading>
        <Text mb={8}>
          Upload, manage, and access your documents and media files securely.
        </Text>
        <Link href="/kms/upload">
          <Button colorScheme="orange" size="lg">
            Go to Upload Page
          </Button>
        </Link>
      </Box>
    </Flex>
  );
}
