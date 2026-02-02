"use client";

import React, { useState, useEffect } from 'react';
import {
  Box,
  Container,
  Heading,
  Button,
  VStack,
  HStack,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Badge,
  Text,
  useDisclosure,
  useToast,
  Flex,
  Select,
  Input,
  InputGroup,
  InputLeftElement,
  Icon,
  Spinner,
  AlertDialog,
  AlertDialogBody,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogContent,
  AlertDialogOverlay,
  IconButton,
  Tooltip,
  Grid,
  GridItem,
  Stat,
  StatLabel,
  StatNumber,
  StatGroup,
  Card,
  CardBody,
  useColorModeValue,
} from '@chakra-ui/react';
import {
  FiPlus,
  FiSearch,
  FiGlobe,
  FiPlay,
  FiPause,
  FiEdit,
  FiTrash2,
  FiRefreshCw,
  FiExternalLink,
  FiClock,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import { format } from 'date-fns';
import WebSourceModal from '@/components/WebSourceModal';

interface WebSource {
  id: string;
  url: string;
  domain: string;
  title?: string;
  description?: string;
  status: 'active' | 'paused' | 'error' | 'completed';
  priority: number;
  crawl_frequency: string;
  last_crawled?: string;
  next_crawl?: string;
  page_count: number;
  total_documents: number;
  error_count: number;
  last_error?: string;
  created_at: string;
  crawl_jobs?: CrawlJob[];
}

interface CrawlJob {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  started_at?: string;
  completed_at?: string;
  pages_crawled: number;
  pages_processed: number;
  error_message?: string;
}

interface WebSourcesStats {
  statusCounts: Record<string, number>;
  domainCounts: Record<string, number>;
  totalSources: number;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'active': return 'green';
    case 'paused': return 'yellow';
    case 'error': return 'red';
    case 'completed': return 'blue';
    default: return 'gray';
  }
};

const getJobStatusColor = (status: string) => {
  switch (status) {
    case 'running': return 'blue';
    case 'completed': return 'green';
    case 'failed': return 'red';
    case 'pending': return 'yellow';
    case 'cancelled': return 'gray';
    default: return 'gray';
  }
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case 'active': return FiCheckCircle;
    case 'paused': return FiPause;
    case 'error': return FiXCircle;
    case 'completed': return FiCheckCircle;
    default: return FiAlertCircle;
  }
};

export default function WebSourcesPage() {
  const [sources, setSources] = useState<WebSource[]>([]);
  const [stats, setStats] = useState<WebSourcesStats>({ statusCounts: {}, domainCounts: {}, totalSources: 0 });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [domainFilter, setDomainFilter] = useState('');
  const [selectedSource, setSelectedSource] = useState<WebSource | null>(null);
  const [sourceToDelete, setSourceToDelete] = useState<WebSource | null>(null);
  const [crawlingSource, setCrawlingSource] = useState<string | null>(null);

  const { isOpen, onOpen, onClose } = useDisclosure();
  const { isOpen: isDeleteOpen, onOpen: onDeleteOpen, onClose: onDeleteClose } = useDisclosure();
  const cancelRef = React.useRef<HTMLButtonElement>(null);
  const toast = useToast();
  
  const cardBg = useColorModeValue('white', 'gray.800');
  const borderColor = useColorModeValue('gray.200', 'gray.600');

  useEffect(() => {
    fetchSources();
  }, [statusFilter, domainFilter]);

  const fetchSources = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (statusFilter) params.append('status', statusFilter);
      if (domainFilter) params.append('domain', domainFilter);

      const response = await fetch(`/api/web-sources?${params}`);
      const data = await response.json();

      if (data.success) {
        setSources(data.data.sources);
        setStats(data.data.stats);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to fetch web sources: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateSource = () => {
    setSelectedSource(null);
    onOpen();
  };

  const handleEditSource = (source: WebSource) => {
    setSelectedSource(source);
    onOpen();
  };

  const handleDeleteSource = (source: WebSource) => {
    setSourceToDelete(source);
    onDeleteOpen();
  };

  const confirmDelete = async () => {
    if (!sourceToDelete) return;

    try {
      const response = await fetch(`/api/web-sources/${sourceToDelete.id}`, {
        method: 'DELETE',
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: 'Web source deleted successfully',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchSources();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to delete web source: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    } finally {
      onDeleteClose();
      setSourceToDelete(null);
    }
  };

  const handleCrawlSource = async (source: WebSource) => {
    try {
      setCrawlingSource(source.id);
      
      const response = await fetch(`/api/web-sources/${source.id}/crawl`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          priority: 8, // High priority for manual crawls
          maxPages: 50,
          jobType: 'manual',
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Crawl Started',
          description: `Started crawling ${source.domain}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        
        // Refresh sources to show updated status
        setTimeout(() => {
          fetchSources();
          setCrawlingSource(null);
        }, 2000);
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to start crawl: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
      setCrawlingSource(null);
    }
  };

  const handleToggleStatus = async (source: WebSource) => {
    const newStatus = source.status === 'active' ? 'paused' : 'active';
    
    try {
      const response = await fetch(`/api/web-sources/${source.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await response.json();

      if (data.success) {
        toast({
          title: 'Success',
          description: `Web source ${newStatus}`,
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
        fetchSources();
      } else {
        throw new Error(data.message);
      }
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to update status: ${error instanceof Error ? error.message : 'Unknown error'}`,
        status: 'error',
        duration: 5000,
        isClosable: true,
      });
    }
  };

  const filteredSources = sources.filter(source => {
    const matchesSearch = source.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         source.domain.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (source.title && source.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesSearch;
  });

  const getCurrentJob = (source: WebSource) => {
    return source.crawl_jobs?.find(job => job.status === 'running' || job.status === 'pending');
  };

  return (
    <Container maxW="container.xl" py={8}>
      <VStack spacing={6} align="stretch">
        {/* Header */}
        <Flex justify="space-between" align="center">
          <Heading size="lg" color="orange.400">
            Web Sources Management
          </Heading>
          <Button
            leftIcon={<Icon as={FiPlus} />}
            colorScheme="orange"
            onClick={handleCreateSource}
          >
            Add Web Source
          </Button>
        </Flex>

        {/* Statistics Cards */}
        <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Total Sources</StatLabel>
                  <StatNumber>{stats.totalSources}</StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Active</StatLabel>
                  <StatNumber color="green.400">{stats.statusCounts.active || 0}</StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Paused</StatLabel>
                  <StatNumber color="yellow.400">{stats.statusCounts.paused || 0}</StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>

          <Card bg={cardBg} borderColor={borderColor}>
            <CardBody>
              <StatGroup>
                <Stat>
                  <StatLabel>Errors</StatLabel>
                  <StatNumber color="red.400">{stats.statusCounts.error || 0}</StatNumber>
                </Stat>
              </StatGroup>
            </CardBody>
          </Card>
        </Grid>

        {/* Filters */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody>
            <Grid templateColumns="repeat(auto-fit, minmax(200px, 1fr))" gap={4}>
              <InputGroup>
                <InputLeftElement>
                  <Icon as={FiSearch} color="gray.400" />
                </InputLeftElement>
                <Input
                  placeholder="Search sources..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </InputGroup>

              <Select
                placeholder="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="active">Active</option>
                <option value="paused">Paused</option>
                <option value="error">Error</option>
                <option value="completed">Completed</option>
              </Select>

              <Select
                placeholder="Filter by domain"
                value={domainFilter}
                onChange={(e) => setDomainFilter(e.target.value)}
              >
                {Object.keys(stats.domainCounts).map(domain => (
                  <option key={domain} value={domain}>
                    {domain} ({stats.domainCounts[domain]})
                  </option>
                ))}
              </Select>

              <Button
                leftIcon={<Icon as={FiRefreshCw} />}
                onClick={fetchSources}
                isLoading={loading}
              >
                Refresh
              </Button>
            </Grid>
          </CardBody>
        </Card>

        {/* Sources Table */}
        <Card bg={cardBg} borderColor={borderColor}>
          <CardBody p={0}>
            {loading ? (
              <Flex justify="center" py={8}>
                <Spinner size="lg" color="orange.400" />
              </Flex>
            ) : filteredSources.length === 0 ? (
              <Flex justify="center" py={8}>
                <Text color="gray.500">No web sources found</Text>
              </Flex>
            ) : (
              <Box overflowX="auto">
                <Table variant="simple">
                  <Thead bg="gray.50" _dark={{ bg: "gray.700" }}>
                    <Tr>
                      <Th>Source</Th>
                      <Th>Status</Th>
                      <Th>Current Job</Th>
                      <Th>Pages</Th>
                      <Th>Last Crawled</Th>
                      <Th>Next Crawl</Th>
                      <Th>Actions</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {filteredSources.map((source) => {
                      const currentJob = getCurrentJob(source);
                      
                      return (
                        <Tr key={source.id}>
                          <Td>
                            <VStack align="start" spacing={1}>
                              <HStack>
                                <Icon as={FiGlobe} color="gray.400" />
                                <Text fontWeight="medium" fontSize="sm">
                                  {source.title || source.domain}
                                </Text>
                                <Tooltip label="Open in new tab">
                                  <IconButton
                                    aria-label="Open source"
                                    icon={<FiExternalLink />}
                                    size="xs"
                                    variant="ghost"
                                    onClick={() => window.open(source.url, '_blank')}
                                  />
                                </Tooltip>
                              </HStack>
                              <Text fontSize="xs" color="gray.500">
                                {source.url}
                              </Text>
                              {source.priority > 5 && (
                                <Badge size="sm" colorScheme="orange">
                                  High Priority
                                </Badge>
                              )}
                            </VStack>
                          </Td>
                          
                          <Td>
                            <Badge 
                              colorScheme={getStatusColor(source.status)}
                              variant="subtle"
                            >
                              <HStack spacing={1}>
                                <Icon as={getStatusIcon(source.status)} boxSize={3} />
                                <Text>{source.status}</Text>
                              </HStack>
                            </Badge>
                            {source.error_count > 0 && (
                              <Tooltip label={source.last_error}>
                                <Badge colorScheme="red" size="sm" ml={1}>
                                  {source.error_count} errors
                                </Badge>
                              </Tooltip>
                            )}
                          </Td>

                          <Td>
                            {currentJob ? (
                              <VStack align="start" spacing={1}>
                                <Badge 
                                  colorScheme={getJobStatusColor(currentJob.status)}
                                  variant="subtle"
                                >
                                  {currentJob.status}
                                </Badge>
                                {currentJob.status === 'running' && (
                                  <Text fontSize="xs" color="gray.500">
                                    {currentJob.pages_crawled} pages crawled
                                  </Text>
                                )}
                              </VStack>
                            ) : (
                              <Text fontSize="sm" color="gray.500">-</Text>
                            )}
                          </Td>

                          <Td>
                            <VStack align="start" spacing={1}>
                              <Text fontSize="sm">
                                {source.page_count} pages
                              </Text>
                              <Text fontSize="xs" color="gray.500">
                                {source.total_documents} documents
                              </Text>
                            </VStack>
                          </Td>

                          <Td>
                            {source.last_crawled ? (
                              <Tooltip label={format(new Date(source.last_crawled), 'PPpp')}>
                                <Text fontSize="sm">
                                  {format(new Date(source.last_crawled), 'MMM d, HH:mm')}
                                </Text>
                              </Tooltip>
                            ) : (
                              <Text fontSize="sm" color="gray.500">Never</Text>
                            )}
                          </Td>

                          <Td>
                            {source.next_crawl ? (
                              <Tooltip label={format(new Date(source.next_crawl), 'PPpp')}>
                                <HStack>
                                  <Icon as={FiClock} color="gray.400" boxSize={3} />
                                  <Text fontSize="sm">
                                    {format(new Date(source.next_crawl), 'MMM d, HH:mm')}
                                  </Text>
                                </HStack>
                              </Tooltip>
                            ) : (
                              <Text fontSize="sm" color="gray.500">-</Text>
                            )}
                          </Td>

                          <Td>
                            <HStack spacing={1}>
                              <Tooltip label="Start crawl">
                                <IconButton
                                  aria-label="Crawl source"
                                  icon={<FiPlay />}
                                  size="sm"
                                  colorScheme="green"
                                  variant="ghost"
                                  onClick={() => handleCrawlSource(source)}
                                  isLoading={crawlingSource === source.id}
                                  isDisabled={!!currentJob || source.status !== 'active'}
                                />
                              </Tooltip>

                              <Tooltip label={source.status === 'active' ? 'Pause' : 'Resume'}>
                                <IconButton
                                  aria-label={source.status === 'active' ? 'Pause' : 'Resume'}
                                  icon={source.status === 'active' ? <FiPause /> : <FiPlay />}
                                  size="sm"
                                  colorScheme="yellow"
                                  variant="ghost"
                                  onClick={() => handleToggleStatus(source)}
                                />
                              </Tooltip>

                              <Tooltip label="Edit source">
                                <IconButton
                                  aria-label="Edit source"
                                  icon={<FiEdit />}
                                  size="sm"
                                  colorScheme="blue"
                                  variant="ghost"
                                  onClick={() => handleEditSource(source)}
                                />
                              </Tooltip>

                              <Tooltip label="Delete source">
                                <IconButton
                                  aria-label="Delete source"
                                  icon={<FiTrash2 />}
                                  size="sm"
                                  colorScheme="red"
                                  variant="ghost"
                                  onClick={() => handleDeleteSource(source)}
                                />
                              </Tooltip>
                            </HStack>
                          </Td>
                        </Tr>
                      );
                    })}
                  </Tbody>
                </Table>
              </Box>
            )}
          </CardBody>
        </Card>
      </VStack>

      {/* Web Source Modal */}
      <WebSourceModal
        isOpen={isOpen}
        onClose={onClose}
        source={selectedSource as any}
        onSuccess={fetchSources}
      />

      {/* Delete Confirmation */}
      <AlertDialog
        isOpen={isDeleteOpen}
        leastDestructiveRef={cancelRef}
        onClose={onDeleteClose}
      >
        <AlertDialogOverlay>
          <AlertDialogContent>
            <AlertDialogHeader fontSize="lg" fontWeight="bold">
              Delete Web Source
            </AlertDialogHeader>

            <AlertDialogBody>
              Are you sure you want to delete <strong>{sourceToDelete?.domain}</strong>?
              This will also delete all associated pages and crawl data.
            </AlertDialogBody>

            <AlertDialogFooter>
              <Button ref={cancelRef} onClick={onDeleteClose}>
                Cancel
              </Button>
              <Button colorScheme="red" onClick={confirmDelete} ml={3}>
                Delete
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Container>
  );
}