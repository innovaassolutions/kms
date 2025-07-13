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
  IconButton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalFooter,
  ModalBody,
  ModalCloseButton,
  useDisclosure,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  Menu,
  MenuButton,
  MenuList,
  MenuItem,
} from "@chakra-ui/react";
import { FiSearch, FiFile, FiMusic, FiVideo, FiCalendar, FiTag, FiEdit, FiTrash2, FiMoreVertical, FiPlus } from "react-icons/fi";

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
  
  // Edit modal state
  const { isOpen: isEditOpen, onOpen: onEditOpen, onClose: onEditClose } = useDisclosure();
  const [editingDoc, setEditingDoc] = useState<Document | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editType, setEditType] = useState("");
  const [editTags, setEditTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState("");
  
  // Delete confirmation state
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const [deletingDoc, setDeletingDoc] = useState<Document | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue("gray.50", "#181f2a");
  const cardBg = useColorModeValue("white", "#232b39");
  const cardText = useColorModeValue("gray.800", "white");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("white", "#2d3748");
  const inputColor = useColorModeValue("gray.900", "white");

  // Load initial documents
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await fetch('api/search');
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

  // Document management functions
  const openEditModal = (doc: Document) => {
    setEditingDoc(doc);
    setEditTitle(doc.title);
    setEditType(doc.type);
    setEditTags([...doc.tags]);
    setTagInput("");
    onEditOpen();
  };

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if ((e.key === "," || e.key === "Enter") && tagInput.trim()) {
      e.preventDefault();
      if (!editTags.includes(tagInput.trim())) {
        setEditTags([...editTags, tagInput.trim()]);
      }
      setTagInput("");
    }
  };

  const removeEditTag = (tag: string) => {
    setEditTags(editTags.filter(t => t !== tag));
  };

  const saveDocument = async () => {
    if (!editingDoc) return;
    
    try {
      // Update document via API - we'll need to create this endpoint
      const response = await fetch(`api/documents/${editingDoc.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title: editTitle,
          type: editType,
          tags: editTags,
        }),
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document updated successfully",
          status: "success",
        });
        loadDocuments(); // Reload documents
        onEditClose();
      } else {
        throw new Error('Failed to update document');
      }
    } catch (error) {
      console.error('Error updating document:', error);
      toast({
        title: "Error",
        description: "Failed to update document",
        status: "error",
      });
    }
  };

  const openDeleteModal = (doc: Document) => {
    setDeletingDoc(doc);
    onDeleteOpen();
  };

  const deleteDocument = async () => {
    if (!deletingDoc) return;
    
    setIsDeleting(true);
    try {
      const response = await fetch(`api/documents/${deletingDoc.id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        toast({
          title: "Success",
          description: "Document deleted successfully",
          status: "success",
        });
        loadDocuments(); // Reload documents
        onDeleteClose();
      } else {
        throw new Error('Failed to delete document');
      }
    } catch (error) {
      console.error('Error deleting document:', error);
      toast({
        title: "Error",
        description: "Failed to delete document",
        status: "error",
      });
    } finally {
      setIsDeleting(false);
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
      const response = await fetch('api/search', {
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

  const handleKeyDown = (e: React.KeyboardEvent) => {
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
                  onKeyDown={handleKeyDown}
                  bg={inputBg}
                  color={inputColor}
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
                  bg={inputBg}
                  color={inputColor}
                  borderColor={borderColor}
                >
                  <option value="strategy">Strategy</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="sop">SOP</option>
                  <option value="idea">Idea</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="whitepaper">Whitepaper</option>
                  <option value="project-plan">Project Plan</option>
                  <option value="project-charter">Project Charter</option>
                </Select>

                <Select
                  placeholder="All Media Types"
                  value={selectedMediaType}
                  onChange={(e) => setSelectedMediaType(e.target.value)}
                  bg={inputBg}
                  color={inputColor}
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
                                {(doc as any).similarity && (
                                  <Badge colorScheme="orange" variant="subtle">
                                    {Math.round((doc as any).similarity * 100)}% match
                                  </Badge>
                                )}
                              </HStack>
                            </Box>
                            
                            <HStack spacing={2}>
                              <Icon as={FiCalendar} color="gray.400" />
                              <Text fontSize="sm" color="gray.500">
                                {formatDate(doc.created_at)}
                              </Text>
                              
                              {/* Management buttons */}
                              <Menu>
                                <MenuButton
                                  as={IconButton}
                                  icon={<Icon as={FiMoreVertical} />}
                                  variant="ghost"
                                  size="sm"
                                  aria-label="Document actions"
                                />
                                <MenuList>
                                  <MenuItem 
                                    icon={<Icon as={FiEdit} />}
                                    onClick={() => openEditModal(doc)}
                                  >
                                    Edit
                                  </MenuItem>
                                  <MenuItem 
                                    icon={<Icon as={FiTrash2} />}
                                    onClick={() => openDeleteModal(doc)}
                                    color="red.500"
                                  >
                                    Delete
                                  </MenuItem>
                                </MenuList>
                              </Menu>
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

      {/* Edit Document Modal */}
      <Modal isOpen={isEditOpen} onClose={onEditClose} size="lg">
        <ModalOverlay />
        <ModalContent>
          <ModalHeader>Edit Document</ModalHeader>
          <ModalCloseButton />
          <ModalBody>
            <VStack spacing={4}>
              <Box w="full">
                <Text mb={2} fontWeight="semibold">Title</Text>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Document title"
                />
              </Box>
              
              <Box w="full">
                <Text mb={2} fontWeight="semibold">Type</Text>
                <Select
                  value={editType}
                  onChange={(e) => setEditType(e.target.value)}
                >
                  <option value="strategy">Strategy</option>
                  <option value="meeting">Meeting</option>
                  <option value="email">Email</option>
                  <option value="sop">SOP</option>
                  <option value="idea">Idea</option>
                  <option value="audio">Audio</option>
                  <option value="video">Video</option>
                  <option value="whitepaper">Whitepaper</option>
                  <option value="project-plan">Project Plan</option>
                  <option value="project-charter">Project Charter</option>
                </Select>
              </Box>
              
              <Box w="full">
                <Text mb={2} fontWeight="semibold">Tags</Text>
                <Input
                  value={tagInput}
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={handleTagKeyDown}
                  placeholder="Add a tag and press comma or enter"
                  mb={2}
                />
                
                {editTags.length > 0 && (
                  <Wrap spacing={2}>
                    {editTags.map(tag => (
                      <WrapItem key={tag}>
                        <Tag size="md" colorScheme="orange" borderRadius="full">
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton onClick={() => removeEditTag(tag)} />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                )}
              </Box>
            </VStack>
          </ModalBody>
          <ModalFooter>
            <Button variant="ghost" mr={3} onClick={onEditClose}>
              Cancel
            </Button>
            <Button colorScheme="orange" onClick={saveDocument}>
              Save Changes
            </Button>
          </ModalFooter>
        </ModalContent>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Document
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete &ldquo;{deletingDoc?.title}&rdquo;? This action cannot be undone.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button 
                colorScheme="red" 
                onClick={deleteDocument}
                isLoading={isDeleting}
                ml={3}
              >
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
} 