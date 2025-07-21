"use client";

import React, { useState, useEffect } from 'react';
import {
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  ModalCloseButton,
  Button,
  FormControl,
  FormLabel,
  Input,
  Textarea,
  Select,
  NumberInput,
  NumberInputField,
  NumberInputStepper,
  NumberIncrementStepper,
  NumberDecrementStepper,
  Switch,
  VStack,
  HStack,
  Text,
  Badge,
  useToast,
  Accordion,
  AccordionItem,
  AccordionButton,
  AccordionPanel,
  AccordionIcon,
  Box,
  FormHelperText,
  Divider,
  Grid,
  GridItem,
  Tag,
  TagLabel,
  TagCloseButton,
  Wrap,
  WrapItem,
  Icon,
} from '@chakra-ui/react';
import { FiGlobe, FiSettings, FiClock, FiFilter } from 'react-icons/fi';

interface WebSource {
  id: string;
  url: string;
  domain: string;
  title?: string;
  description?: string;
  status: 'active' | 'paused' | 'error' | 'completed';
  priority: number;
  crawl_frequency: string;
  max_depth: number;
  follow_redirects: boolean;
  respect_robots_txt: boolean;
  include_patterns: string[];
  exclude_patterns: string[];
  content_types: string[];
  tags: string[];
  extract_images: boolean;
  follow_external_links: boolean;
  max_file_size_mb: number;
}

interface WebSourceModalProps {
  isOpen: boolean;
  onClose: () => void;
  source?: WebSource | null;
  onSuccess: () => void;
}

const CRAWL_FREQUENCIES = [
  { value: '1 hour', label: 'Every Hour' },
  { value: '6 hours', label: 'Every 6 Hours' },
  { value: '12 hours', label: 'Every 12 Hours' },
  { value: '24 hours', label: 'Daily' },
  { value: '3 days', label: 'Every 3 Days' },
  { value: '7 days', label: 'Weekly' },
  { value: '30 days', label: 'Monthly' },
];

const DEFAULT_CONTENT_TYPES = [
  'text/html',
  'application/pdf',
  'text/plain',
];

const COMMON_PATTERNS = {
  includePatterns: [
    '.*\\/docs\\/.*',
    '.*\\/documentation\\/.*',
    '.*\\/api\\/.*',
    '.*\\/blog\\/.*',
    '.*\\/articles\\/.*',
  ],
  excludePatterns: [
    '.*\\.(jpg|jpeg|png|gif|css|js|ico)$',
    '.*\\/admin\\/.*',
    '.*\\/login\\/.*',
    '.*\\/logout\\/.*',
    '.*\\/search\\?.*',
  ],
};

export default function WebSourceModal({ isOpen, onClose, source, onSuccess }: WebSourceModalProps) {
  const [formData, setFormData] = useState({
    url: '',
    title: '',
    description: '',
    crawlFrequency: '24 hours',
    priority: 5,
    maxDepth: 3,
    followRedirects: true,
    respectRobotsTxt: true,
    includePatterns: [] as string[],
    excludePatterns: [] as string[],
    contentTypes: DEFAULT_CONTENT_TYPES,
    tags: [] as string[],
    extractImages: false,
    followExternalLinks: false,
    maxFileSizeMB: 50,
    startCrawlImmediately: false,
  });

  const [newIncludePattern, setNewIncludePattern] = useState('');
  const [newExcludePattern, setNewExcludePattern] = useState('');
  const [newTag, setNewTag] = useState('');
  const [loading, setLoading] = useState(false);
  const [urlValidation, setUrlValidation] = useState<{ isValid: boolean; message: string }>({
    isValid: true,
    message: '',
  });

  const toast = useToast();
  const isEditing = !!source;

  useEffect(() => {
    if (source) {
      setFormData({
        url: source.url,
        title: source.title || '',
        description: source.description || '',
        crawlFrequency: source.crawl_frequency,
        priority: source.priority,
        maxDepth: source.max_depth,
        followRedirects: source.follow_redirects,
        respectRobotsTxt: source.respect_robots_txt,
        includePatterns: source.include_patterns || [],
        excludePatterns: source.exclude_patterns || [],
        contentTypes: source.content_types || DEFAULT_CONTENT_TYPES,
        tags: source.tags || [],
        extractImages: source.extract_images,
        followExternalLinks: source.follow_external_links,
        maxFileSizeMB: source.max_file_size_mb,
        startCrawlImmediately: false,
      });
    } else {
      // Reset form for new source
      setFormData({
        url: '',
        title: '',
        description: '',
        crawlFrequency: '24 hours',
        priority: 5,
        maxDepth: 3,
        followRedirects: true,
        respectRobotsTxt: true,
        includePatterns: [],
        excludePatterns: [],
        contentTypes: DEFAULT_CONTENT_TYPES,
        tags: [],
        extractImages: false,
        followExternalLinks: false,
        maxFileSizeMB: 50,
        startCrawlImmediately: false,
      });
    }
  }, [source, isOpen]);

  const validateUrl = (url: string) => {
    if (!url) {
      setUrlValidation({ isValid: false, message: 'URL is required' });
      return;
    }

    try {
      const parsedUrl = new URL(url);
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
        setUrlValidation({ isValid: false, message: 'Only HTTP and HTTPS URLs are supported' });
        return;
      }
      setUrlValidation({ isValid: true, message: '' });
    } catch (error) {
      setUrlValidation({ isValid: false, message: 'Invalid URL format' });
    }
  };

  const handleUrlChange = (value: string) => {
    setFormData(prev => ({ ...prev, url: value }));
    validateUrl(value);
    
    // Auto-generate title from URL if not set
    if (value && !formData.title) {
      try {
        const domain = new URL(value).hostname;
        setFormData(prev => ({ ...prev, title: domain }));
      } catch (error) {
        // Invalid URL, ignore
      }
    }
  };

  const addPattern = (type: 'include' | 'exclude') => {
    const pattern = type === 'include' ? newIncludePattern : newExcludePattern;
    if (!pattern.trim()) return;

    const key = type === 'include' ? 'includePatterns' : 'excludePatterns';
    setFormData(prev => ({
      ...prev,
      [key]: [...prev[key], pattern.trim()],
    }));

    if (type === 'include') {
      setNewIncludePattern('');
    } else {
      setNewExcludePattern('');
    }
  };

  const removePattern = (type: 'include' | 'exclude', index: number) => {
    const key = type === 'include' ? 'includePatterns' : 'excludePatterns';
    setFormData(prev => ({
      ...prev,
      [key]: prev[key].filter((_, i) => i !== index),
    }));
  };

  const addCommonPattern = (type: 'include' | 'exclude', pattern: string) => {
    const key = type === 'include' ? 'includePatterns' : 'excludePatterns';
    if (!formData[key].includes(pattern)) {
      setFormData(prev => ({
        ...prev,
        [key]: [...prev[key], pattern],
      }));
    }
  };

  const addTag = () => {
    if (!newTag.trim() || formData.tags.includes(newTag.trim())) return;
    
    setFormData(prev => ({
      ...prev,
      tags: [...prev.tags, newTag.trim()],
    }));
    setNewTag('');
  };

  const removeTag = (index: number) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async () => {
    if (!urlValidation.isValid) {
      toast({
        title: 'Error',
        description: 'Please fix the URL validation errors',
        status: 'error',
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setLoading(true);

    try {
      const url = isEditing ? `/kms/api/web-sources/${source.id}` : '/kms/api/web-sources';
      const method = isEditing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: formData.url,
          title: formData.title,
          description: formData.description,
          crawlFrequency: formData.crawlFrequency,
          priority: formData.priority,
          maxDepth: formData.maxDepth,
          followRedirects: formData.followRedirects,
          respectRobotsTxt: formData.respectRobotsTxt,
          includePatterns: formData.includePatterns,
          excludePatterns: formData.excludePatterns,
          contentTypes: formData.contentTypes,
          tags: formData.tags,
          extractImages: formData.extractImages,
          followExternalLinks: formData.followExternalLinks,
          maxFileSizeMB: formData.maxFileSizeMB,
          startCrawlImmediately: formData.startCrawlImmediately,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: data.message,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        onSuccess();
        onClose();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to ${isEditing ? 'update' : 'create'} web source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="4xl" scrollBehavior="inside">
      <ModalOverlay />
      <ModalContent maxH="90vh">
        <ModalHeader>
          <HStack>
            <Icon as={FiGlobe} />
            <Text>{isEditing ? 'Edit Web Source' : 'Add Web Source'}</Text>
          </HStack>
        </ModalHeader>
        <ModalCloseButton />

        <ModalBody>
          <VStack spacing={6} align="stretch">
            {/* Basic Information */}
            <Box>
              <Text fontSize="lg" fontWeight="bold" mb={4}>
                Basic Information
              </Text>
              
              <VStack spacing={4} align="stretch">
                <FormControl isRequired isInvalid={!urlValidation.isValid}>
                  <FormLabel>URL</FormLabel>
                  <Input
                    value={formData.url}
                    onChange={(e) => handleUrlChange(e.target.value)}
                    placeholder="https://example.com"
                    isDisabled={isEditing} // Don't allow URL changes when editing
                  />
                  {!urlValidation.isValid && (
                    <FormHelperText color="red.500">
                      {urlValidation.message}
                    </FormHelperText>
                  )}
                </FormControl>

                <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                  <FormControl>
                    <FormLabel>Title</FormLabel>
                    <Input
                      value={formData.title}
                      onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                      placeholder="Source title"
                    />
                  </FormControl>

                  <FormControl>
                    <FormLabel>Priority</FormLabel>
                    <NumberInput
                      value={formData.priority}
                      onChange={(_, value) => setFormData(prev => ({ ...prev, priority: value || 5 }))}
                      min={1}
                      max={10}
                    >
                      <NumberInputField />
                      <NumberInputStepper>
                        <NumberIncrementStepper />
                        <NumberDecrementStepper />
                      </NumberInputStepper>
                    </NumberInput>
                    <FormHelperText>1 = Low, 10 = High priority</FormHelperText>
                  </FormControl>
                </Grid>

                <FormControl>
                  <FormLabel>Description</FormLabel>
                  <Textarea
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional description of this web source"
                    rows={3}
                  />
                </FormControl>

                <FormControl>
                  <FormLabel>Tags</FormLabel>
                  <HStack>
                    <Input
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Add tag"
                      onKeyPress={(e) => e.key === 'Enter' && addTag()}
                    />
                    <Button onClick={addTag} isDisabled={!newTag.trim()}>
                      Add
                    </Button>
                  </HStack>
                  <Wrap mt={2}>
                    {formData.tags.map((tag, index) => (
                      <WrapItem key={index}>
                        <Tag size="md" variant="solid" colorScheme="blue">
                          <TagLabel>{tag}</TagLabel>
                          <TagCloseButton onClick={() => removeTag(index)} />
                        </Tag>
                      </WrapItem>
                    ))}
                  </Wrap>
                </FormControl>
              </VStack>
            </Box>

            <Divider />

            {/* Crawl Settings */}
            <Accordion allowToggle>
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Icon as={FiClock} />
                      <Text fontSize="lg" fontWeight="bold">Crawl Settings</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={4} align="stretch">
                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <FormControl>
                        <FormLabel>Crawl Frequency</FormLabel>
                        <Select
                          value={formData.crawlFrequency}
                          onChange={(e) => setFormData(prev => ({ ...prev, crawlFrequency: e.target.value }))}
                        >
                          {CRAWL_FREQUENCIES.map(freq => (
                            <option key={freq.value} value={freq.value}>
                              {freq.label}
                            </option>
                          ))}
                        </Select>
                      </FormControl>

                      <FormControl>
                        <FormLabel>Max Depth</FormLabel>
                        <NumberInput
                          value={formData.maxDepth}
                          onChange={(_, value) => setFormData(prev => ({ ...prev, maxDepth: value || 3 }))}
                          min={1}
                          max={10}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                        <FormHelperText>How deep to crawl from the start URL</FormHelperText>
                      </FormControl>
                    </Grid>

                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <FormControl>
                        <FormLabel>Max File Size (MB)</FormLabel>
                        <NumberInput
                          value={formData.maxFileSizeMB}
                          onChange={(_, value) => setFormData(prev => ({ ...prev, maxFileSizeMB: value || 50 }))}
                          min={1}
                          max={500}
                        >
                          <NumberInputField />
                          <NumberInputStepper>
                            <NumberIncrementStepper />
                            <NumberDecrementStepper />
                          </NumberInputStepper>
                        </NumberInput>
                      </FormControl>

                      <VStack align="stretch" spacing={3}>
                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb="0">Respect robots.txt</FormLabel>
                          <Switch
                            isChecked={formData.respectRobotsTxt}
                            onChange={(e) => setFormData(prev => ({ ...prev, respectRobotsTxt: e.target.checked }))}
                          />
                        </FormControl>

                        <FormControl display="flex" alignItems="center">
                          <FormLabel mb="0">Follow redirects</FormLabel>
                          <Switch
                            isChecked={formData.followRedirects}
                            onChange={(e) => setFormData(prev => ({ ...prev, followRedirects: e.target.checked }))}
                          />
                        </FormControl>
                      </VStack>
                    </Grid>

                    <Grid templateColumns="repeat(2, 1fr)" gap={4}>
                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb="0">Extract images</FormLabel>
                        <Switch
                          isChecked={formData.extractImages}
                          onChange={(e) => setFormData(prev => ({ ...prev, extractImages: e.target.checked }))}
                        />
                      </FormControl>

                      <FormControl display="flex" alignItems="center">
                        <FormLabel mb="0">Follow external links</FormLabel>
                        <Switch
                          isChecked={formData.followExternalLinks}
                          onChange={(e) => setFormData(prev => ({ ...prev, followExternalLinks: e.target.checked }))}
                        />
                      </FormControl>
                    </Grid>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>

              {/* URL Patterns */}
              <AccordionItem>
                <AccordionButton>
                  <Box flex="1" textAlign="left">
                    <HStack>
                      <Icon as={FiFilter} />
                      <Text fontSize="lg" fontWeight="bold">URL Patterns</Text>
                    </HStack>
                  </Box>
                  <AccordionIcon />
                </AccordionButton>
                <AccordionPanel pb={4}>
                  <VStack spacing={6} align="stretch">
                    {/* Include Patterns */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>Include Patterns (Regex)</Text>
                      <Text fontSize="sm" color="gray.500" mb={3}>
                        Only crawl URLs that match these patterns
                      </Text>
                      
                      <HStack mb={2}>
                        <Input
                          value={newIncludePattern}
                          onChange={(e) => setNewIncludePattern(e.target.value)}
                          placeholder="e.g., .*\/docs\/.*"
                          onKeyPress={(e) => e.key === 'Enter' && addPattern('include')}
                        />
                        <Button onClick={() => addPattern('include')} isDisabled={!newIncludePattern.trim()}>
                          Add
                        </Button>
                      </HStack>

                      <Text fontSize="sm" color="gray.500" mb={2}>Common patterns:</Text>
                      <Wrap mb={3}>
                        {COMMON_PATTERNS.includePatterns.map((pattern, index) => (
                          <WrapItem key={index}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addCommonPattern('include', pattern)}
                              isDisabled={formData.includePatterns.includes(pattern)}
                            >
                              {pattern}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>

                      <Wrap>
                        {formData.includePatterns.map((pattern, index) => (
                          <WrapItem key={index}>
                            <Tag size="md" variant="solid" colorScheme="green">
                              <TagLabel fontFamily="mono" fontSize="xs">{pattern}</TagLabel>
                              <TagCloseButton onClick={() => removePattern('include', index)} />
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>

                    {/* Exclude Patterns */}
                    <Box>
                      <Text fontWeight="medium" mb={2}>Exclude Patterns (Regex)</Text>
                      <Text fontSize="sm" color="gray.500" mb={3}>
                        Skip URLs that match these patterns
                      </Text>
                      
                      <HStack mb={2}>
                        <Input
                          value={newExcludePattern}
                          onChange={(e) => setNewExcludePattern(e.target.value)}
                          placeholder="e.g., .*\.(jpg|png|css)$"
                          onKeyPress={(e) => e.key === 'Enter' && addPattern('exclude')}
                        />
                        <Button onClick={() => addPattern('exclude')} isDisabled={!newExcludePattern.trim()}>
                          Add
                        </Button>
                      </HStack>

                      <Text fontSize="sm" color="gray.500" mb={2}>Common patterns:</Text>
                      <Wrap mb={3}>
                        {COMMON_PATTERNS.excludePatterns.map((pattern, index) => (
                          <WrapItem key={index}>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => addCommonPattern('exclude', pattern)}
                              isDisabled={formData.excludePatterns.includes(pattern)}
                            >
                              {pattern}
                            </Button>
                          </WrapItem>
                        ))}
                      </Wrap>

                      <Wrap>
                        {formData.excludePatterns.map((pattern, index) => (
                          <WrapItem key={index}>
                            <Tag size="md" variant="solid" colorScheme="red">
                              <TagLabel fontFamily="mono" fontSize="xs">{pattern}</TagLabel>
                              <TagCloseButton onClick={() => removePattern('exclude', index)} />
                            </Tag>
                          </WrapItem>
                        ))}
                      </Wrap>
                    </Box>
                  </VStack>
                </AccordionPanel>
              </AccordionItem>
            </Accordion>

            {/* Start Crawl Option */}
            {!isEditing && (
              <FormControl display="flex" alignItems="center">
                <FormLabel mb="0">Start crawling immediately</FormLabel>
                <Switch
                  isChecked={formData.startCrawlImmediately}
                  onChange={(e) => setFormData(prev => ({ ...prev, startCrawlImmediately: e.target.checked }))}
                />
                <FormHelperText ml={3}>
                  {formData.startCrawlImmediately ? 'Will start crawling right after creation' : 'Will be scheduled according to crawl frequency'}
                </FormHelperText>
              </FormControl>
            )}
          </VStack>
        </ModalBody>

        <ModalFooter>
          <Button variant="ghost" mr={3} onClick={onClose}>
            Cancel
          </Button>
          <Button
            colorScheme="orange"
            onClick={handleSubmit}
            isLoading={loading}
            isDisabled={!urlValidation.isValid}
          >
            {isEditing ? 'Update Source' : 'Create Source'}
          </Button>
        </ModalFooter>
      </ModalContent>
    </Modal>
  );
}