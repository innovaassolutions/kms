"use client";

import { Box, Heading, Text, Button, Flex, HStack } from "@chakra-ui/react";
import Link from "next/link";

export default function KMSHomePage() {
  return (
    <Flex minH="100vh" align="center" justify="center" bg="gray.50">
      <Box p={8} bg="white" borderRadius="xl" boxShadow="lg" textAlign="center">
        <Heading mb={4}>Welcome to the Knowledge Management System (KMS)</Heading>
        <Text mb={8}>
          Upload, manage, and access your documents and media files securely.
        </Text>
        <HStack spacing={4}>
          <Link href="/kms/upload">
            <Button colorScheme="orange" size="lg">
              Upload Documents
            </Button>
          </Link>
          <Link href="/kms/status">
            <Button colorScheme="blue" size="lg" variant="outline">
              View Status
            </Button>
          </Link>
        </HStack>
      </Box>
    </Flex>
  );
}
