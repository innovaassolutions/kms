"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Heading,
  Text,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Button,
  useToast,
  Flex,
  Spinner,
  VStack,
  HStack,
  Icon,
} from "@chakra-ui/react";
import { FiRefreshCw, FiFile, FiMusic, FiVideo, FiCheck, FiX, FiClock } from "react-icons/fi";

interface Document {
  id: string;
  title: string;
  media_type: 'text' | 'audio' | 'video';
  transcription_status: 'pending' | 'completed' | 'error' | null;
  content_text?: string;
  transcription?: string;
  embedding?: number[];
  created_at: string;
}

export default function DocumentStatusPage() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const toast = useToast();

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/api/process-documents');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        throw new Error('Failed to fetch documents');
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to fetch document status",
        status: "error",
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDocuments();
  };

  const getStatusBadge = (status: string | null, mediaType: string) => {
    if (mediaType === 'text') {
      return status === 'completed' ? (
        <Badge colorScheme="green">Processed</Badge>
      ) : status === 'error' ? (
        <Badge colorScheme="red">Error</Badge>
      ) : (
        <Badge colorScheme="yellow">Pending</Badge>
      );
    } else {
      return status === 'completed' ? (
        <Badge colorScheme="green">Transcribed</Badge>
      ) : status === 'error' ? (
        <Badge colorScheme="red">Error</Badge>
      ) : (
        <Badge colorScheme="yellow">Pending</Badge>
      );
    }
  };

  const getMediaTypeIcon = (mediaType: string) => {
    switch (mediaType) {
      case 'text':
        return <Icon as={FiFile} />;
      case 'audio':
        return <Icon as={FiMusic} />;
      case 'video':
        return <Icon as={FiVideo} />;
      default:
        return <Icon as={FiFile} />;
    }
  };

  const getEmbeddingStatus = (embedding: number[] | null, contentText?: string, transcription?: string) => {
    if (embedding) {
      return <Badge colorScheme="green">Embedded</Badge>;
    } else if (contentText || transcription) {
      return <Badge colorScheme="yellow">Pending</Badge>;
    } else {
      return <Badge colorScheme="gray">No Content</Badge>;
    }
  };

  if (loading) {
    return (
      <Flex minH="100vh" align="center" justify="center">
        <VStack spacing={4}>
          <Spinner size="xl" color="#F25C05" />
          <Text>Loading document status...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="lg" color="#181f2a">Document Processing Status</Heading>
        <Button
          leftIcon={<Icon as={FiRefreshCw} />}
          onClick={handleRefresh}
          isLoading={refreshing}
          colorScheme="orange"
        >
          Refresh
        </Button>
      </Flex>

      {documents.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="lg" color="gray.600">No documents found</Text>
          <Text color="gray.500">Upload some documents to see their processing status</Text>
        </Box>
      ) : (
        <Box overflowX="auto">
          <Table variant="simple">
            <Thead>
              <Tr>
                <Th>Document</Th>
                <Th>Type</Th>
                <Th>Processing Status</Th>
                <Th>Embedding Status</Th>
                <Th>Uploaded</Th>
              </Tr>
            </Thead>
            <Tbody>
              {documents.map((doc) => (
                <Tr key={doc.id}>
                  <Td>
                    <Text fontWeight="medium">{doc.title}</Text>
                  </Td>
                  <Td>
                    <HStack>
                      {getMediaTypeIcon(doc.media_type)}
                      <Text textTransform="capitalize">{doc.media_type}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    {getStatusBadge(doc.transcription_status, doc.media_type)}
                  </Td>
                  <Td>
                    {getEmbeddingStatus(doc.embedding, doc.content_text, doc.transcription)}
                  </Td>
                  <Td>
                    <Text fontSize="sm" color="gray.600">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </Text>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Box mt={8} p={4} bg="gray.50" borderRadius="md">
        <Heading size="md" mb={4}>Status Legend</Heading>
        <VStack align="start" spacing={2}>
          <HStack>
            <Badge colorScheme="green">Processed/Transcribed</Badge>
            <Text fontSize="sm">Document has been successfully processed</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="yellow">Pending</Badge>
            <Text fontSize="sm">Document is waiting to be processed</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="red">Error</Badge>
            <Text fontSize="sm">An error occurred during processing</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="green">Embedded</Badge>
            <Text fontSize="sm">Vector embedding has been generated</Text>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
} 