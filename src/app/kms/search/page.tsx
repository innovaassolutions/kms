"use client";

import React, { useState, useEffect } from "react";
import {
  Box,
  Input,
  Button,
  VStack,
  HStack,
  Text,
  Card,
  CardBody,
  Badge,
  Flex,
  Spinner,
  useToast,
  Select,
  Icon,
  InputGroup,
  InputLeftElement,
  Divider,
  Heading,
  useColorModeValue,
} from "@chakra-ui/react";
import { FiSearch, FiFile, FiMusic, FiVideo, FiCalendar, FiTag } from "react-icons/fi";

interface SearchResult {
  id: string;
  title: string;
  type: string;
  media_type: 'text' | 'audio' | 'video';
  tags: string[];
  similarity?: number;
  content_preview: string;
  created_at: string;
  file_path?: string;
}

interface Document {
  id: string;
  title: string;
  type: string;
  media_type: 'text' | 'audio' | 'video';
  tags: string[];
  content_preview: string;
  created_at: string;
}

export default function SearchPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedType, setSelectedType] = useState("");
  const [selectedMediaType, setSelectedMediaType] = useState("");
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue("gray.50", "#181f2a");
  const cardBg = useColorModeValue("white", "#232b39");
  const cardText = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");

  // Load initial documents
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/search');
      if (response.ok) {
        const data = await response.json();
        setDocuments(data.documents || []);
      } else {
        throw new Error('Failed to load documents');
      }
    } catch (error) {
      console.error('Error loading documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      toast({
        title: "Search Query Required",
        description: "Please enter a search term",
        status: "warning",
      });
      return;
    }

    setSearching(true);
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          limit: 10,
          threshold: 0.7
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.results || []);
        
        if (data.results.length === 0) {
          toast({
            title: "No Results",
            description: "Try different keywords or check your documents",
            status: "info",
          });
        }
      } else {
        throw new Error('Search failed');
      }
    } catch (error) {
      console.error('Search error:', error);
      toast({
        title: "Search Error",
        description: "Failed to perform search",
        status: "error",
      });
    } finally {
      setSearching(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const filterDocuments = (docs: Document[]) => {
    let filtered = docs;

    if (selectedType) {
      filtered = filtered.filter(doc => doc.type === selectedType);
    }

    if (selectedMediaType) {
      filtered = filtered.filter(doc => doc.media_type === selectedMediaType);
    }

    return filtered;
  };

  const displayResults = results.length > 0 ? results : filterDocuments(documents);
  const isSearchMode = results.length > 0;

  return (
    <Box minH="100vh" bg={bgColor} p={8}>
      <VStack spacing={8} maxW="1200px" mx="auto">
        {/* Header */}
        <Box textAlign="center" w="full">
          <Heading size="lg" color={cardText} mb={2}>
            Knowledge Management Search
          </Heading>
          <Text color="gray.600" fontSize="lg">
            Search through your documents using semantic AI-powered search
          </Text>
        </Box>

        {/* Search Interface */}
        <Card w="full" bg={cardBg} boxShadow="lg">
          <CardBody>
            <VStack spacing={4}>
              {/* Search Input */}
              <InputGroup size="lg">
                <InputLeftElement>
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search your documents..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyPress={handleKeyPress}
                  bg="white"
                  border="2px solid"
                  borderColor={borderColor}
                  _focus={{ borderColor: "#F25C05" }}
                />
              </InputGroup>

              {/* Filters */}
              <HStack spacing={4} w="full">
                <Select
                  placeholder="All Types"
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  bg="white"
                  borderColor={borderColor}
                >
                  <option value="strategy">Strategy</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="sop">SOP</option>
                  <option value="idea">Idea</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                </Select>

                <Select
                  placeholder="All Media Types"
                  value={selectedMediaType}
                  onChange={(e) => setSelectedMediaType(e.target.value)}
                  bg="white"
                  borderColor={borderColor}
                >
                  <option value="text">Text</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                </Select>

                <Button
                  colorScheme="orange"
                  onClick={handleSearch}
                  isLoading={searching}
                  loadingText="Searching"
                  px={8}
                >
                  Search
                </Button>

                {isSearchMode && (
                  <Button
                    variant="outline"
                    onClick={() => {
                      setResults([]);
                      setQuery("");
                      setSelectedType("");
                      setSelectedMediaType("");
                    }}
                  >
                    Clear
                  </Button>
                )}
              </HStack>
            </VStack>
          </CardBody>
        </Card>

        {/* Results */}
        <Box w="full">
          {loading ? (
            <Flex justify="center" py={12}>
              <VStack spacing={4}>
                <Spinner size="xl" color="#F25C05" />
                <Text>Loading documents...</Text>
              </VStack>
            </Flex>
          ) : (
            <>
              {/* Results Header */}
              <Flex justify="space-between" align="center" mb={6}>
                <Text fontSize="lg" fontWeight="bold" color={cardText}>
                  {isSearchMode ? `Search Results (${results.length})` : `All Documents (${displayResults.length})`}
                </Text>
                {isSearchMode && (
                  <Text fontSize="sm" color="gray.500">
                    Showing semantic search results
                  </Text>
                )}
              </Flex>

              {/* Results List */}
              <VStack spacing={4} align="stretch">
                {displayResults.length === 0 ? (
                  <Card bg={cardBg} p={8} textAlign="center">
                    <Text color="gray.500">
                      {isSearchMode ? "No search results found. Try different keywords." : "No documents available."}
                    </Text>
                  </Card>
                ) : (
                  displayResults.map((doc) => (
                    <Card key={doc.id} bg={cardBg} boxShadow="md" _hover={{ boxShadow: "lg" }}>
                      <CardBody>
                        <VStack align="stretch" spacing={3}>
                          {/* Header */}
                          <Flex justify="space-between" align="start">
                            <Box flex={1}>
                              <HStack spacing={2} mb={2}>
                                {getMediaTypeIcon(doc.media_type)}
                                <Text fontWeight="bold" fontSize="lg" color={cardText}>
                                  {doc.title}
                                </Text>
                              </HStack>
                              
                              <HStack spacing={2} mb={2}>
                                <Badge colorScheme="blue" variant="subtle">
                                  {doc.type}
                                </Badge>
                                <Badge colorScheme="green" variant="subtle">
                                  {doc.media_type}
                                </Badge>
                                {doc.similarity && (
                                  <Badge colorScheme="orange" variant="subtle">
                                    {Math.round(doc.similarity * 100)}% match
                                  </Badge>
                                )}
                              </HStack>
                            </Box>
                            
                            <HStack spacing={2}>
                              <Icon as={FiCalendar} color="gray.400" />
                              <Text fontSize="sm" color="gray.500">
                                {formatDate(doc.created_at)}
                              </Text>
                            </HStack>
                          </Flex>

                          {/* Content Preview */}
                          <Box>
                            <Text color="gray.600" fontSize="sm" lineHeight="1.5">
                              {doc.content_preview}
                            </Text>
                          </Box>

                          {/* Tags */}
                          {doc.tags && doc.tags.length > 0 && (
                            <HStack spacing={2}>
                              <Icon as={FiTag} color="gray.400" />
                              <HStack spacing={1}>
                                {doc.tags.map((tag, index) => (
                                  <Badge key={index} size="sm" colorScheme="gray" variant="outline">
                                    {tag}
                                  </Badge>
                                ))}
                              </HStack>
                            </HStack>
                          )}
                        </VStack>
                      </CardBody>
                    </Card>
                  ))
                )}
              </VStack>
            </>
          )}
        </Box>
      </VStack>
    </Box>
  );
} 