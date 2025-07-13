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
  useColorModeValue,
} from "@chakra-ui/react";
import { FiRefreshCw, FiFile, FiMusic, FiVideo, FiCheck, FiX, FiClock, FiTrash2 } from "react-icons/fi";

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
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const toast = useToast();

  // Theme-aware color values
  const headingColor = useColorModeValue("gray.800", "white");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const mutedTextColor = useColorModeValue("gray.500", "gray.400");
  const legendBgColor = useColorModeValue("gray.50", "gray.700");
  const spinnerColor = useColorModeValue("orange.500", "orange.300");

  const fetchDocuments = async () => {
    try {
      const response = await fetch('/kms/api/process-documents');
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

  const handleDelete = async (documentId: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"? This action cannot be undone.`)) {
      return;
    }

    setDeletingIds(prev => new Set(prev).add(documentId));

    try {
      const response = await fetch(`/kms/api/documents/${documentId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setDocuments(prev => prev.filter(doc => doc.id !== documentId));
        toast({
          title: "Document deleted",
          description: `"${title}" has been deleted successfully`,
          status: "success",
        });
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete document",
        status: "error",
      });
    } finally {
      setDeletingIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(documentId);
        return newSet;
      });
    }
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
          <Spinner size="xl" color={spinnerColor} />
          <Text color={textColor}>Loading document status...</Text>
        </VStack>
      </Flex>
    );
  }

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <Flex justify="space-between" align="center" mb={8}>
        <Heading size="lg" color={headingColor}>Document Processing Status</Heading>
        <Button
          leftIcon={<Icon as={FiRefreshCw} />}
          onClick={handleRefresh}
          isLoading={refreshing}
          bg="#F25C05"
          color="white"
          fontWeight="bold"
          borderRadius="6px"
          _hover={{ bg: "#d94e04" }}
          fontFamily="Montserrat, Arial, sans-serif"
        >
          Refresh
        </Button>
      </Flex>

      {documents.length === 0 ? (
        <Box textAlign="center" py={12}>
          <Text fontSize="lg" color={textColor}>No documents found</Text>
          <Text color={mutedTextColor}>Upload some documents to see their processing status</Text>
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
                <Th>Actions</Th>
              </Tr>
            </Thead>
            <Tbody>
              {documents.map((doc) => (
                <Tr key={doc.id}>
                  <Td>
                    <Text fontWeight="medium" color={headingColor}>{doc.title}</Text>
                  </Td>
                  <Td>
                    <HStack>
                      {getMediaTypeIcon(doc.media_type)}
                      <Text textTransform="capitalize" color={textColor}>{doc.media_type}</Text>
                    </HStack>
                  </Td>
                  <Td>
                    {getStatusBadge(doc.transcription_status, doc.media_type)}
                  </Td>
                  <Td>
                    {getEmbeddingStatus(doc.embedding || null, doc.content_text, doc.transcription)}
                  </Td>
                  <Td>
                    <Text fontSize="sm" color={textColor}>
                      {new Date(doc.created_at).toLocaleDateString()}
                    </Text>
                  </Td>
                  <Td>
                    <Button
                      size="sm"
                      colorScheme="red"
                      variant="outline"
                      leftIcon={<Icon as={FiTrash2} />}
                      onClick={() => handleDelete(doc.id, doc.title)}
                      isLoading={deletingIds.has(doc.id)}
                      loadingText="Deleting"
                    >
                      Delete
                    </Button>
                  </Td>
                </Tr>
              ))}
            </Tbody>
          </Table>
        </Box>
      )}

      <Box mt={8} p={4} bg={legendBgColor} borderRadius="md">
        <Heading size="md" mb={4} color={headingColor}>Status Legend</Heading>
        <VStack align="start" spacing={2}>
          <HStack>
            <Badge colorScheme="green">Processed/Transcribed</Badge>
            <Text fontSize="sm" color={textColor}>Document has been successfully processed</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="yellow">Pending</Badge>
            <Text fontSize="sm" color={textColor}>Document is waiting to be processed</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="red">Error</Badge>
            <Text fontSize="sm" color={textColor}>An error occurred during processing</Text>
          </HStack>
          <HStack>
            <Badge colorScheme="green">Embedded</Badge>
            <Text fontSize="sm" color={textColor}>Vector embedding has been generated</Text>
          </HStack>
        </VStack>
      </Box>
    </Box>
  );
} 