"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Box,
  Heading,
  Text,
  SimpleGrid,
  Card,
  CardBody,
  Stat,
  StatLabel,
  StatNumber,
  StatHelpText,
  Spinner,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Alert,
  AlertIcon,
  AlertTitle,
  AlertDescription,
  Progress,
  Badge,
  Button,
  Tooltip,
} from "@chakra-ui/react";
import { FiFile, FiHardDrive, FiPieChart, FiDatabase, FiRefreshCw } from "react-icons/fi";
import dynamic from "next/dynamic";
import { supabase } from "@/utils/supabase/client";
import PromotionalLanding from "@/components/PromotionalLanding";

// Dynamically import Chart.js components to avoid SSR issues
const Pie = dynamic(() => import("react-chartjs-2").then((mod) => mod.Pie), {
  ssr: false,
});

// Register Chart.js components on client side only
if (typeof window !== "undefined") {
  import("chart.js").then((mod) => {
    mod.Chart.register(mod.ArcElement, mod.Tooltip, mod.Legend);
  });
}

interface DashboardStats {
  totalDocuments: number;
  typeCounts: Record<string, number>;
  totalSize: number;
  processingStatus: {
    pending: number;
    processed: number;
    embedded: number;
    error: number;
  };
  wordCloud?: Array<{
    word: string;
    count: number;
    category: string;
  }>;
  errors?: {
    countError?: any;
    typeError?: any;
    sizeError?: any;
  };
}

export default function AuthGatedPage() {
  const [authChecked, setAuthChecked] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Theme-aware colors
  const headingColor = useColorModeValue("gray.800", "white");
  const textColor = useColorModeValue("gray.600", "gray.300");
  const cardBg = useColorModeValue("white", "#232b39");
  const spinnerColor = useColorModeValue("orange.500", "orange.300");
  const typeBoxBg = useColorModeValue("gray.50", "gray.700");
  const legendColor = useColorModeValue("#4A5568", "#E2E8F0");

  // Check authentication first
  useEffect(() => {
    async function checkAuth() {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        setIsAuthenticated(!!user);
      } catch {
        setIsAuthenticated(false);
      } finally {
        setAuthChecked(true);
      }
    }
    checkAuth();
  }, []);

  // Handle client-side mounting
  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchStats = async (showUpdating = false) => {
    try {
      if (showUpdating) setIsUpdating(true);

      const response = await fetch("/api/dashboard-stats");

      if (!response.ok) {
        throw new Error(
          `Failed to fetch dashboard stats: ${response.status} ${response.statusText}`
        );
      }
      const data = await response.json();
      setStats(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
      setIsUpdating(false);
    }
  };

  // Initial fetch (only if authenticated)
  useEffect(() => {
    if (authChecked && isAuthenticated) {
      fetchStats();
    }
  }, [authChecked, isAuthenticated]);

  // Set up auto-refresh interval
  useEffect(() => {
    if (!authChecked || !isAuthenticated) return;

    if (!loading && !error) {
      intervalRef.current = setInterval(() => {
        fetchStats(true);
      }, 5000);

      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [loading, error, authChecked, isAuthenticated]);

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getProcessingProgress = () => {
    if (!stats?.processingStatus)
      return { percentage: 0, stage: "No Data", color: "gray" };

    const { pending, processed, embedded, error } = stats.processingStatus;
    const total = pending + processed + embedded + error;

    if (total === 0) return { percentage: 0, stage: "No Documents", color: "gray" };

    const progressValue = (embedded * 100 + processed * 66 + pending * 33) / total;

    let stage = "";
    let color = "";

    if (pending > 0) {
      stage = "Processing";
      color = "yellow";
    } else if (processed > 0) {
      stage = "Embedding";
      color = "blue";
    } else if (embedded > 0) {
      stage = "Complete";
      color = "green";
    } else if (error > 0) {
      stage = "Error";
      color = "red";
    }

    return { percentage: Math.round(progressValue), stage, color };
  };

  const getPieChartData = () => {
    if (!stats?.typeCounts) return null;

    const labels = Object.keys(stats.typeCounts);
    const data = Object.values(stats.typeCounts);

    const colors = [
      "#F25C05", "#FF8C42", "#FFB84D", "#F2CC8F", "#81C784",
      "#4FC3F7", "#9575CD", "#F06292", "#FF7043", "#A1887F",
    ];

    return {
      labels: labels.map((label) => label.toUpperCase()),
      datasets: [
        {
          data,
          backgroundColor: colors.slice(0, labels.length),
          borderColor: colors.slice(0, labels.length),
          borderWidth: 1,
        },
      ],
    };
  };

  const getWordCloudComponent = () => {
    if (!stats?.wordCloud || stats.wordCloud.length === 0) return null;

    const colors = [
      "#F25C05", "#FF8C42", "#FFB84D", "#F2CC8F", "#81C784",
      "#4FC3F7", "#9575CD", "#F06292", "#FF7043", "#A1887F",
    ];

    const counts = stats.wordCloud.map((word) => word.count);
    const minCount = Math.min(...counts);
    const maxCount = Math.max(...counts);

    const scaleFontSize = (count: number) => {
      if (maxCount === minCount) return 24;
      const normalized = (count - minCount) / (maxCount - minCount);
      return Math.round(14 + normalized * 28);
    };

    const getWordStyle = (index: number) => {
      const seedRandom = (seed: number) => {
        const x = Math.sin(seed) * 10000;
        return x - Math.floor(x);
      };

      const rotation = (seedRandom(index * 1.5) - 0.5) * 60;
      const xOffset = (seedRandom(index * 2.3) - 0.5) * 80;
      const yOffset = (seedRandom(index * 3.7) - 0.5) * 60;

      return {
        position: "absolute" as const,
        left: `${50 + xOffset}%`,
        top: `${50 + yOffset}%`,
        transform: `translate(-50%, -50%) rotate(${rotation}deg)`,
        whiteSpace: "nowrap" as const,
      };
    };

    return (
      <Box position="relative" h="400px" w="100%" overflow="hidden" p={4}>
        {stats.wordCloud.map((word, index) => (
          <Text
            key={word.word}
            fontSize={`${scaleFontSize(word.count)}px`}
            fontWeight="bold"
            color={colors[index % colors.length]}
            cursor="pointer"
            transition="all 0.3s ease"
            _hover={{
              transform: `translate(-50%, -50%) rotate(0deg) scale(1.1)`,
              opacity: 0.8,
              zIndex: 10,
            }}
            title={`${word.word}: ${word.count} occurrences`}
            userSelect="none"
            style={getWordStyle(index)}
            zIndex={1}
          >
            {word.word}
          </Text>
        ))}
      </Box>
    );
  };

  const getChartOptions = () => {
    if (!mounted) return {};

    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "bottom" as const,
          labels: {
            color: legendColor,
            font: {
              size: 14,
            },
          },
        },
        tooltip: {
          callbacks: {
            label: (context: any) => {
              const total = context.dataset.data.reduce(
                (a: number, b: number) => a + b,
                0
              );
              const percentage = ((context.parsed / total) * 100).toFixed(1);
              return `${context.label}: ${context.parsed} (${percentage}%)`;
            },
          },
        },
      },
    };
  };

  // ── AUTH CHECK: show landing page while checking (this is what SSR renders for crawlers) ──
  if (!authChecked) {
    return <PromotionalLanding />;
  }

  // ── NOT AUTHENTICATED: show promotional landing ──
  if (!isAuthenticated) {
    return <PromotionalLanding />;
  }

  // ── AUTHENTICATED: show dashboard ──
  if (loading) {
    return (
      <Box minH="100vh" display="flex" alignItems="center" justifyContent="center">
        <VStack spacing={4}>
          <Spinner size="xl" color={spinnerColor} />
          <Text color={textColor}>Loading dashboard...</Text>
        </VStack>
      </Box>
    );
  }

  if (error) {
    return (
      <Box p={8} maxW="1200px" mx="auto">
        <Alert status="error" borderRadius="md">
          <AlertIcon />
          <AlertTitle>Error loading dashboard!</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </Box>
    );
  }

  return (
    <Box p={8} maxW="1200px" mx="auto">
      <VStack spacing={8} align="stretch">
        {/* Header */}
        <Box>
          <VStack spacing={4} align="stretch">
            <HStack justify="space-between" align="center">
              <VStack align="start" spacing={1}>
                <Heading size="xl" color={headingColor}>
                  KMS Dashboard
                </Heading>
                <Text fontSize="lg" color={textColor}>
                  Knowledge Management System Overview
                </Text>
              </VStack>

              <VStack align="end" spacing={2}>
                <Tooltip label="Refresh dashboard data">
                  <Button
                    size="sm"
                    variant="outline"
                    leftIcon={<FiRefreshCw />}
                    onClick={() => fetchStats(true)}
                    isLoading={isUpdating}
                    loadingText="Updating"
                  >
                    Refresh
                  </Button>
                </Tooltip>

                {lastUpdated && (
                  <VStack align="end" spacing={1}>
                    <Text fontSize="xs" color={textColor}>
                      Last updated: {lastUpdated.toLocaleTimeString()}
                    </Text>
                    {!error && (
                      <HStack spacing={1}>
                        <Box
                          w={2}
                          h={2}
                          bg="green.400"
                          borderRadius="full"
                          animation="pulse 2s infinite"
                        />
                        <Text fontSize="xs" color={textColor}>
                          Auto-refresh active
                        </Text>
                      </HStack>
                    )}
                  </VStack>
                )}
              </VStack>
            </HStack>

            {isUpdating && (
              <Box>
                <Progress size="xs" isIndeterminate colorScheme="orange" />
              </Box>
            )}
          </VStack>
        </Box>

        {/* Processing Status */}
        {stats?.processingStatus && (
          <Card bg={cardBg}>
            <CardBody>
              <VStack spacing={4} align="stretch">
                <HStack justify="space-between">
                  <Heading size="md" color={headingColor}>
                    Processing Status
                  </Heading>
                  <Badge
                    colorScheme={getProcessingProgress().color}
                    fontSize="sm"
                  >
                    {getProcessingProgress().stage}
                  </Badge>
                </HStack>

                <Progress
                  value={getProcessingProgress().percentage}
                  colorScheme={getProcessingProgress().color}
                  size="lg"
                  borderRadius="md"
                />

                <HStack justify="space-between" fontSize="sm" color={textColor}>
                  <Text>{getProcessingProgress().percentage}% Complete</Text>
                  <Text>
                    {stats.processingStatus.embedded +
                      stats.processingStatus.processed}{" "}
                    / {stats.totalDocuments} processed
                  </Text>
                </HStack>

                <SimpleGrid columns={4} spacing={2}>
                  <VStack spacing={1}>
                    <Text fontSize="lg" fontWeight="bold" color="yellow.500">
                      {stats.processingStatus.pending}
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      Pending
                    </Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Text fontSize="lg" fontWeight="bold" color="blue.500">
                      {stats.processingStatus.processed}
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      Processed
                    </Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Text fontSize="lg" fontWeight="bold" color="green.500">
                      {stats.processingStatus.embedded}
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      Embedded
                    </Text>
                  </VStack>
                  <VStack spacing={1}>
                    <Text fontSize="lg" fontWeight="bold" color="red.500">
                      {stats.processingStatus.error}
                    </Text>
                    <Text fontSize="xs" color={textColor}>
                      Error
                    </Text>
                  </VStack>
                </SimpleGrid>
              </VStack>
            </CardBody>
          </Card>
        )}

        {/* Stats Grid */}
        <SimpleGrid columns={{ base: 1, md: 3 }} spacing={6}>
          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <HStack>
                  <Icon as={FiFile} size="24px" color="#F25C05" />
                  <VStack align="start" spacing={1}>
                    <StatLabel color={textColor}>Total Documents</StatLabel>
                    <StatNumber color={headingColor} fontSize="2xl">
                      {stats?.totalDocuments || 0}
                    </StatNumber>
                    <StatHelpText color={textColor}>
                      Files in storage
                    </StatHelpText>
                  </VStack>
                </HStack>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <HStack>
                  <Icon as={FiPieChart} size="24px" color="#F25C05" />
                  <VStack align="start" spacing={1}>
                    <StatLabel color={textColor}>Document Types</StatLabel>
                    <StatNumber color={headingColor} fontSize="2xl">
                      {stats?.typeCounts
                        ? Object.keys(stats.typeCounts).length
                        : 0}
                    </StatNumber>
                    <StatHelpText color={textColor}>
                      Different categories
                    </StatHelpText>
                  </VStack>
                </HStack>
              </Stat>
            </CardBody>
          </Card>

          <Card bg={cardBg}>
            <CardBody>
              <Stat>
                <HStack>
                  <Icon as={FiHardDrive} size="24px" color="#F25C05" />
                  <VStack align="start" spacing={1}>
                    <StatLabel color={textColor}>Storage Used</StatLabel>
                    <StatNumber color={headingColor} fontSize="2xl">
                      {formatFileSize(stats?.totalSize || 0)}
                    </StatNumber>
                    <StatHelpText color={textColor}>
                      Total file size
                    </StatHelpText>
                  </VStack>
                </HStack>
              </Stat>
            </CardBody>
          </Card>
        </SimpleGrid>

        {/* Charts Section */}
        {mounted &&
          stats?.typeCounts &&
          Object.keys(stats.typeCounts).length > 0 && (
            <SimpleGrid columns={{ base: 1, lg: 2 }} spacing={6}>
              {/* Word Cloud */}
              {stats?.wordCloud && stats.wordCloud.length > 0 && (
                <Card bg={cardBg}>
                  <CardBody>
                    <Heading size="md" color={headingColor} mb={4}>
                      Word Frequency Cloud
                    </Heading>
                    {getWordCloudComponent()}
                  </CardBody>
                </Card>
              )}

              {/* File Type Distribution Chart */}
              <Card bg={cardBg}>
                <CardBody>
                  <Heading size="md" color={headingColor} mb={4}>
                    File Type Distribution
                  </Heading>
                  <Box h="400px">
                    <Pie
                      data={getPieChartData()!}
                      options={getChartOptions()}
                    />
                  </Box>
                </CardBody>
              </Card>
            </SimpleGrid>
          )}

        {/* File Types Breakdown */}
        {stats?.typeCounts && Object.keys(stats.typeCounts).length > 0 && (
          <Card bg={cardBg}>
            <CardBody>
              <Heading size="md" color={headingColor} mb={4}>
                File Types Breakdown
              </Heading>
              <SimpleGrid columns={{ base: 2, md: 4 }} spacing={4}>
                {Object.entries(stats.typeCounts).map(([type, count]) => (
                  <Box key={type} p={4} borderRadius="md" bg={typeBoxBg}>
                    <Text
                      fontWeight="bold"
                      color={headingColor}
                      textTransform="uppercase"
                    >
                      {type}
                    </Text>
                    <Text fontSize="2xl" color="#F25C05" fontWeight="bold">
                      {count}
                    </Text>
                  </Box>
                ))}
              </SimpleGrid>
            </CardBody>
          </Card>
        )}

        {/* Empty State */}
        {(!stats?.typeCounts ||
          Object.keys(stats.typeCounts).length === 0) && (
          <Card bg={cardBg}>
            <CardBody textAlign="center" py={12}>
              <Icon as={FiDatabase} size="48px" color={textColor} mb={4} />
              <Text fontSize="lg" color={textColor} mb={2}>
                No documents found
              </Text>
              <Text color={textColor}>
                Upload some documents to see statistics and analytics
              </Text>
            </CardBody>
          </Card>
        )}
      </VStack>
    </Box>
  );
}
