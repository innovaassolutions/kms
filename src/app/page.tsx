"use client";

import { Box, Flex, Heading, Text, Button, useColorModeValue } from '@chakra-ui/react';

export default function HomePage() {
  const headingColor = useColorModeValue('#181f2a', '#fff');
  const bodyTextColor = useColorModeValue('#222', '#d1d5db');
  const cardBg = useColorModeValue('white', '#232b39');
  const cardText = useColorModeValue('gray.800', 'white');
  const pageBg = useColorModeValue('gray.50', '#181f2a');

  return (
    <Flex minH="100vh" align="center" justify="center" bg={pageBg}>
      <Box p={8} bg={cardBg} borderRadius="xl" boxShadow="lg" textAlign="center">
        <Heading mb={4} color={headingColor} fontFamily="Montserrat, Arial, sans-serif">
          Welcome to the Knowledge Management System (KMS)
        </Heading>
        <Text mb={8} color={bodyTextColor} fontSize="lg">
          Upload, manage, and access your documents and media files securely.
        </Text>
        <Button as="a" href="/kms/upload" bg="#F25C05" color="white" fontWeight="bold" size="lg" borderRadius="md" _hover={{ bg: "#d94e04" }}>
          Go to Upload Page
        </Button>
      </Box>
    </Flex>
  );
}
