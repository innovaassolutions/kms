"use client";

import React, { useState, useRef, useEffect } from "react";
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
  Icon,
  InputGroup,
  InputRightElement,
  Heading,
  useColorModeValue,
  Avatar,
  Collapse,
  IconButton,
  Select,
  FormControl,
  FormLabel,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
} from "@chakra-ui/react";
import { FiSend, FiUser, FiMessageCircle, FiChevronDown, FiChevronUp, FiFile, FiFilter, FiSettings } from "react-icons/fi";
import { LLMProvider } from "@/utils/llmService";

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  provider?: LLMProvider;
  model?: string;
  context?: Array<{
    title: string;
    type: string;
    content: string;
    similarity: number;
  }>;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string>("");
  const [showContext, setShowContext] = useState<{ [key: string]: boolean }>({});
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [llmProvider, setLlmProvider] = useState<LLMProvider>('openai');
  const [llmModel, setLlmModel] = useState('gpt-4o-mini');
  const [showHeader, setShowHeader] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  // Theme colors
  const bgColor = useColorModeValue("gray.50", "#181f2a");
  const cardBg = useColorModeValue("white", "#232b39");
  const userBg = useColorModeValue("#F25C05", "#F25C05");
  const assistantBg = useColorModeValue("gray.100", "#2d3748");
  const borderColor = useColorModeValue("gray.200", "gray.600");
  const inputBg = useColorModeValue("white", "#2d3748");
  const inputColor = useColorModeValue("gray.900", "white");
  const placeholderColor = useColorModeValue("gray.500", "gray.400");

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Load available tags on component mount
  useEffect(() => {
    loadAvailableTags();
  }, []);

  // Auto-hide header when messages exist (but not for filter selections)
  useEffect(() => {
    if (messages.length > 0 && showHeader) {
      // Hide header automatically when messages exist
      setShowHeader(false);
      setShowFilters(false);
    }
  }, [messages.length, showHeader]);

  const loadAvailableTags = async () => {
    try {
      const response = await fetch('/kms/api/search');
      if (response.ok) {
        const data = await response.json();
        const allTags = new Set<string>();
        data.documents.forEach((doc: any) => {
          if (doc.tags && Array.isArray(doc.tags)) {
            doc.tags.forEach((tag: string) => allTags.add(tag));
          }
        });
        setAvailableTags(Array.from(allTags).sort());
      }
    } catch (error) {
      console.error('Error loading tags:', error);
    }
  };

  const addTag = (tag: string) => {
    if (!selectedTags.includes(tag)) {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter(t => t !== tag));
  };

  // Document type management
  const availableTypes = [
    "strategy", "meeting", "email", "sop", "idea", "audio", "video", "whitepaper", "project-plan", "project-charter", "workshop", "knowledge"
  ];

  const addDocumentType = (type: string) => {
    if (!selectedTypes.includes(type)) {
      setSelectedTypes([...selectedTypes, type]);
    }
  };

  const removeDocumentType = (type: string) => {
    setSelectedTypes(selectedTypes.filter(t => t !== type));
  };

  const sendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: `user_${crypto.randomUUID()}`,
      content: inputMessage.trim(),
      role: 'user',
      timestamp: new Date().toISOString(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage("");
    setLoading(true);

    try {
      const response = await fetch('/kms/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          conversationId: conversationId,
          tags: selectedTags.length > 0 ? selectedTags : undefined,
          types: selectedTypes.length > 0 ? selectedTypes : undefined,
          provider: llmProvider,
          model: llmModel,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to get chat response');
      }

      const data = await response.json();
      
      // Update conversation ID if it's new
      if (!conversationId) {
        setConversationId(data.conversationId);
      }

      const assistantMessage: Message = {
        id: `assistant_${crypto.randomUUID()}`,
        content: data.response,
        role: 'assistant',
        timestamp: data.timestamp,
        context: data.context || [],
        provider: data.provider || llmProvider,
        model: data.model || llmModel,
      };

      setMessages(prev => [...prev, assistantMessage]);

    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Error",
        description: "Failed to send message. Please try again.",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const toggleContext = (messageId: string) => {
    setShowContext(prev => ({
      ...prev,
      [messageId]: !prev[messageId]
    }));
  };

  const formatTime = (timestamp: string) => {
    return new Date(timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Box h="100vh" bg={bgColor} position="relative">
      {/* Fixed Page Title */}
      <Box 
        position="fixed" 
        top="72px" 
        left="64px" 
        right={0} 
        bg={cardBg} 
        borderBottom="1px" 
        borderColor={borderColor} 
        zIndex={20} 
        p={4} 
        textAlign="center"
      >
        <Heading size="lg" mb={1}>
          Knowledge Assistant
        </Heading>
        <Text color="gray.600" fontSize="sm">
          Ask questions about your documents and get AI-powered answers
        </Text>
      </Box>
      
      {/* Scrollable Content Area */}
      <Box h="100vh" overflowY="auto" pt={5}>
        {/* Header */}
        <Box bg={cardBg} borderBottom="1px" borderColor={borderColor} flexShrink={0}>
        {/* Toggle Button when header is hidden */}
        {!showHeader && (
          <Flex justify="center" p={2}>
            <Button
              size="xs"
              variant="ghost"
              leftIcon={<Icon as={FiSettings} />}
              rightIcon={<Icon as={FiChevronDown} />}
              onClick={() => setShowHeader(true)}
              color="gray.600"
            >
              Settings {(selectedTags.length + selectedTypes.length > 0) && `(${selectedTags.length + selectedTypes.length})`}
            </Button>
          </Flex>
        )}
        
        {/* Collapsible Header Content */}
        <Collapse in={showHeader}>
          <Box p={4} pt={2}>
            <HStack justify="flex-end" align="center" mb={2}>
              <IconButton
                aria-label="Hide settings"
                icon={<Icon as={FiChevronUp} />}
                size="sm"
                variant="ghost"
                onClick={() => setShowHeader(false)}
                color="gray.600"
              />
            </HStack>
            
            {/* Controls */}
            <HStack mt={3} justify="center" spacing={4}>
              {/* LLM Provider Selection */}
              <HStack spacing={2}>
                <Icon as={FiSettings} color="gray.600" />
                <Select
                  value={llmProvider}
                  onChange={(e) => {
                    const newProvider = e.target.value as LLMProvider;
                    setLlmProvider(newProvider);
                    // Set default model for provider
                    setLlmModel(newProvider === 'claude' ? 'claude-3-5-sonnet-20241022' : 'gpt-4o-mini');
                  }}
                  size="sm"
                  w="120px"
                  bg={inputBg}
                  color={inputColor}
                >
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude</option>
                </Select>
                <Select
                  value={llmModel}
                  onChange={(e) => setLlmModel(e.target.value)}
                  size="sm"
                  w="180px"
                  bg={inputBg}
                  color={inputColor}
                >
                  {llmProvider === 'openai' ? (
                    <>
                      <option value="gpt-4o">GPT-4o</option>
                      <option value="gpt-4o-mini">GPT-4o Mini</option>
                      <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                    </>
                  ) : (
                    <>
                      <option value="claude-3-5-sonnet-20241022">Claude 3.5 Sonnet</option>
                      <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
                      <option value="claude-3-opus-20240229">Claude 3 Opus</option>
                    </>
                  )}
                </Select>
              </HStack>
              <Button
                size="sm"
                variant="ghost"
                leftIcon={<FiFilter />}
                rightIcon={<Icon as={showFilters ? FiChevronUp : FiChevronDown} />}
                onClick={() => setShowFilters(!showFilters)}
                color="gray.600"
              >
                Filters {(selectedTags.length + selectedTypes.length > 0) && `(${selectedTags.length + selectedTypes.length})`}
              </Button>
            </HStack>
            
            {/* Collapsible Filters */}
            <Collapse in={showFilters}>
              <VStack mt={3} spacing={3}>
                {/* Side-by-side Filters */}
                <HStack spacing={4} align="start" maxW="800px" w="full">
                  {/* Tag Filter */}
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm" color="gray.600">
                      Filter by tags
                    </FormLabel>
                    <Select
                      placeholder="Select a tag to add..."
                      value=""
                      onChange={(e) => e.target.value && addTag(e.target.value)}
                      bg={inputBg}
                      color={inputColor}
                      size="sm"
                    >
                      {availableTags.map(tag => (
                        <option key={tag} value={tag}>{tag}</option>
                      ))}
                    </Select>
                  </FormControl>

                  {/* Document Type Filter */}
                  <FormControl flex={1}>
                    <FormLabel fontSize="sm" color="gray.600">
                      Filter by document types
                    </FormLabel>
                    <Select
                      placeholder="Select a document type to add..."
                      value=""
                      onChange={(e) => e.target.value && addDocumentType(e.target.value)}
                      bg={inputBg}
                      color={inputColor}
                      size="sm"
                    >
                      {availableTypes.filter(type => !selectedTypes.includes(type)).map(type => (
                        <option key={type} value={type}>
                          {type.charAt(0).toUpperCase() + type.slice(1)}
                        </option>
                      ))}
                    </Select>
                  </FormControl>
                </HStack>
                
                {/* Active Filters Display */}
                {(selectedTags.length > 0 || selectedTypes.length > 0) && (
                  <Box maxW="800px" w="full">
                    <Text fontSize="sm" color="gray.600" mb={2}>
                      Active filters:
                    </Text>
                    <HStack spacing={4} align="start">
                      {selectedTags.length > 0 && (
                        <Box flex={1}>
                          <Text fontSize="xs" color="gray.500" mb={1}>Tags:</Text>
                          <Wrap spacing={1}>
                            {selectedTags.map(tag => (
                              <WrapItem key={tag}>
                                <Tag size="sm" colorScheme="orange" borderRadius="full">
                                  <TagLabel>{tag}</TagLabel>
                                  <TagCloseButton onClick={() => removeTag(tag)} />
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        </Box>
                      )}
                      
                      {selectedTypes.length > 0 && (
                        <Box flex={1}>
                          <Text fontSize="xs" color="gray.500" mb={1}>Document Types:</Text>
                          <Wrap spacing={1}>
                            {selectedTypes.map(type => (
                              <WrapItem key={type}>
                                <Tag size="sm" colorScheme="blue" borderRadius="full">
                                  <TagLabel>{type.charAt(0).toUpperCase() + type.slice(1)}</TagLabel>
                                  <TagCloseButton onClick={() => removeDocumentType(type)} />
                                </Tag>
                              </WrapItem>
                            ))}
                          </Wrap>
                        </Box>
                      )}
                    </HStack>
                  </Box>
                )}
              </VStack>
            </Collapse>
          </Box>
        </Collapse>
        </Box>

        {/* Messages Area */}
        <Box px={4} pb={32}>
          <VStack spacing={4} maxW="800px" mx="auto" align="stretch" minH="full" pt={4}>
          {messages.length === 0 ? (
            <Flex justify="center" align="center" h="full">
              <Card bg={cardBg} p={8} textAlign="center" maxW="500px">
                <VStack spacing={4}>
                  <Icon as={FiMessageCircle} size="48px" color="#F25C05" />
                  <Text fontSize="lg" fontWeight="bold">
                    Welcome to your Knowledge Assistant!
                  </Text>
                  <Text color="gray.600">
                    Ask me anything about your documents. I&apos;ll search through your knowledge base and provide relevant answers.
                  </Text>
                  <VStack spacing={2} fontSize="sm" color="gray.500">
                    <Text>• {"What are our key strategies for 2024?"}</Text>
                    <Text>• {"Summarize the latest meeting notes"}</Text>
                    <Text>• {"What SOPs do we have for customer onboarding?"}</Text>
                  </VStack>
                </VStack>
              </Card>
            </Flex>
          ) : (
            messages.map((message) => (
              <Box key={message.id}>
                <Flex
                  justify={message.role === 'user' ? 'flex-end' : 'flex-start'}
                  mb={2}
                >
                  <HStack
                    spacing={3}
                    maxW="70%"
                    flexDirection={message.role === 'user' ? 'row-reverse' : 'row'}
                  >
                    <Avatar
                      size="sm"
                      bg={message.role === 'user' ? userBg : assistantBg}
                      icon={<Icon as={message.role === 'user' ? FiUser : FiMessageCircle} />}
                    />
                    <Box>
                      <Card
                        bg={message.role === 'user' ? userBg : assistantBg}
                        color={message.role === 'user' ? 'white' : 'inherit'}
                      >
                        <CardBody p={3}>
                          <Text whiteSpace="pre-wrap">{message.content}</Text>
                          <Text
                            fontSize="xs"
                            opacity={0.7}
                            mt={2}
                            textAlign={message.role === 'user' ? 'right' : 'left'}
                          >
                            {formatTime(message.timestamp)}
                            {message.role === 'assistant' && message.model && (
                              <Badge size="xs" ml={2} colorScheme={message.provider === 'claude' ? 'purple' : 'teal'}>
                                {message.model}
                              </Badge>
                            )}
                          </Text>
                        </CardBody>
                      </Card>
                      
                      {/* Context Sources for Assistant Messages */}
                      {message.role === 'assistant' && message.context && message.context.length > 0 && (
                        <Box mt={2}>
                          <Button
                            size="sm"
                            variant="ghost"
                            leftIcon={<Icon as={showContext[message.id] ? FiChevronUp : FiChevronDown} />}
                            onClick={() => toggleContext(message.id)}
                            fontSize="xs"
                          >
                            {message.context.length} source{message.context.length > 1 ? 's' : ''} used
                          </Button>
                          
                          <Collapse in={showContext[message.id]}>
                            <VStack spacing={2} mt={2} align="stretch">
                              {message.context.map((source, index) => (
                                <Card key={index} size="sm" bg={cardBg} borderLeft="3px solid" borderLeftColor="#F25C05">
                                  <CardBody p={2}>
                                    <HStack spacing={2} mb={1}>
                                      <Icon as={FiFile} size="12px" />
                                      <Text fontSize="xs" fontWeight="bold">
                                        {source.title}
                                      </Text>
                                      <Badge size="xs" colorScheme="orange">
                                        {Math.round(source.similarity * 100)}% match
                                      </Badge>
                                      <Badge size="xs" colorScheme="gray">
                                        {source.type}
                                      </Badge>
                                    </HStack>
                                    <Text fontSize="xs" color="gray.600" noOfLines={2}>
                                      {source.content.substring(0, 150)}...
                                    </Text>
                                  </CardBody>
                                </Card>
                              ))}
                            </VStack>
                          </Collapse>
                        </Box>
                      )}
                    </Box>
                  </HStack>
                </Flex>
              </Box>
            ))
          )}
          
          {loading && (
            <Flex justify="flex-start">
              <HStack spacing={3}>
                <Avatar
                  size="sm"
                  bg={assistantBg}
                  icon={<Icon as={FiMessageCircle} />}
                />
                <Card bg={assistantBg}>
                  <CardBody p={3}>
                    <HStack spacing={2}>
                      <Spinner size="sm" />
                      <Text>Thinking...</Text>
                    </HStack>
                  </CardBody>
                </Card>
              </HStack>
            </Flex>
          )}
          
            <div ref={messagesEndRef} />
          </VStack>
        </Box>
      </Box>

      {/* Fixed Input Area */}
      <Box 
        position="fixed" 
        bottom={0} 
        left={0} 
        right={0} 
        bg={bgColor} 
        borderTop="1px" 
        borderColor={borderColor} 
        p={4}
        boxShadow="0 -4px 6px -1px rgba(0, 0, 0, 0.1)"
        backdropFilter="blur(8px)"
        zIndex={10}
      >
          <HStack maxW="800px" mx="auto" spacing={2}>
            <InputGroup>
              <Input
                placeholder="Ask me anything about your documents..."
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={handleKeyDown}
                disabled={loading}
                bg={inputBg}
                color={inputColor}
                border="2px solid"
                borderColor={borderColor}
                _focus={{ borderColor: "#F25C05" }}
                _placeholder={{ color: placeholderColor }}
                pr="50px"
                borderRadius="xl"
                boxShadow="md"
              />
              <InputRightElement width="50px">
                <IconButton
                  aria-label="Send message"
                  icon={<Icon as={FiSend} />}
                  onClick={sendMessage}
                  isLoading={loading}
                  disabled={!inputMessage.trim() || loading}
                  colorScheme="orange"
                  size="sm"
                  borderRadius="full"
                />
              </InputRightElement>
            </InputGroup>
          </HStack>
        </Box>
    </Box>
  );
}