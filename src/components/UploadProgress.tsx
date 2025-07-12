"use client";

import React from 'react';
import {
  Box,
  Progress,
  Text,
  VStack,
  HStack,
  Icon,
  useColorModeValue,
  Flex,
  Badge,
  CircularProgress,
  CircularProgressLabel,
} from '@chakra-ui/react';
import { FiUpload, FiCheck, FiX, FiClock } from 'react-icons/fi';
import { UploadProgress as UploadProgressType } from '@/utils/chunkedUploadService';

interface UploadProgressProps {
  progress: UploadProgressType | null;
  fileName: string;
  isComplete: boolean;
  hasError: boolean;
  errorMessage?: string;
}

export const UploadProgressComponent: React.FC<UploadProgressProps> = ({
  progress,
  fileName,
  isComplete,
  hasError,
  errorMessage
}) => {
  const cardBg = useColorModeValue('white', '#232b39');
  const cardText = useColorModeValue('gray.800', 'white');
  const progressBg = useColorModeValue('gray.100', '#202632');
  const successColor = useColorModeValue('green.500', 'green.300');
  const errorColor = useColorModeValue('red.500', 'red.300');

  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    if (seconds < 3600) return `${Math.round(seconds / 60)}m ${Math.round(seconds % 60)}s`;
    return `${Math.round(seconds / 3600)}h ${Math.round((seconds % 3600) / 60)}m`;
  };

  const getStatusIcon = () => {
    if (hasError) return <Icon as={FiX} color={errorColor} />;
    if (isComplete) return <Icon as={FiCheck} color={successColor} />;
    return <Icon as={FiUpload} color="#F25C05" />;
  };

  const getStatusColor = () => {
    if (hasError) return errorColor;
    if (isComplete) return successColor;
    return '#F25C05';
  };

  return (
    <Box
      bg={cardBg}
      borderRadius="lg"
      p={6}
      boxShadow="lg"
      border="1px solid"
      borderColor={useColorModeValue('gray.200', '#353c4a')}
      position="relative"
      overflow="hidden"
    >
      {/* Header */}
      <HStack justify="space-between" align="center" mb={4}>
        <HStack>
          {getStatusIcon()}
          <VStack align="start" spacing={0}>
            <Text fontWeight="bold" color={cardText} fontSize="sm">
              {fileName}
            </Text>
            <Text fontSize="xs" color="gray.500">
              {progress ? formatBytes(progress.totalBytes) : 'Preparing...'}
            </Text>
          </VStack>
        </HStack>
        
        {progress && !isComplete && !hasError && (
          <CircularProgress
            value={progress.percentage}
            color="#F25C05"
            size="40px"
            thickness="8px"
          >
            <CircularProgressLabel fontSize="xs" fontWeight="bold">
              {Math.round(progress.percentage)}%
            </CircularProgressLabel>
          </CircularProgress>
        )}
      </HStack>

      {/* Progress Bar */}
      {progress && !isComplete && !hasError && (
        <VStack spacing={3} align="stretch">
          <Progress
            value={progress.percentage}
            colorScheme="orange"
            bg={progressBg}
            borderRadius="full"
            size="lg"
            hasStripe
            isAnimated
          />
          
          {/* Stats */}
          <Flex justify="space-between" align="center" fontSize="xs" color="gray.500">
            <HStack spacing={4}>
              <Text>
                {formatBytes(progress.uploadedBytes)} / {formatBytes(progress.totalBytes)}
              </Text>
              <Badge colorScheme="orange" fontSize="xs">
                Chunk {progress.chunkIndex}/{progress.totalChunks}
              </Badge>
            </HStack>
            
            <HStack spacing={4}>
              <Text>
                {formatBytes(progress.speed)}/s
              </Text>
              <HStack spacing={1}>
                <Icon as={FiClock} />
                <Text>{formatTime(progress.remainingTime)}</Text>
              </HStack>
            </HStack>
          </Flex>
        </VStack>
      )}

      {/* Completion/Error State */}
      {(isComplete || hasError) && (
        <VStack spacing={2} align="stretch">
          <HStack justify="center">
            <Text
              fontSize="sm"
              fontWeight="bold"
              color={getStatusColor()}
              textAlign="center"
            >
              {hasError ? 'Upload Failed' : 'Upload Complete'}
            </Text>
          </HStack>
          
          {hasError && errorMessage && (
            <Text fontSize="xs" color={errorColor} textAlign="center">
              {errorMessage}
            </Text>
          )}
          
          {isComplete && progress && (
            <Text fontSize="xs" color="gray.500" textAlign="center">
              Uploaded {formatBytes(progress.totalBytes)} successfully
            </Text>
          )}
        </VStack>
      )}

      {/* Animated background for active uploads */}
      {progress && !isComplete && !hasError && (
        <Box
          position="absolute"
          top={0}
          left={0}
          right={0}
          bottom={0}
          bg={`linear-gradient(90deg, transparent 0%, ${useColorModeValue('rgba(242, 92, 5, 0.05)', 'rgba(242, 92, 5, 0.1)')} 50%, transparent 100%)`}
          animation="shimmer 2s infinite"
          pointerEvents="none"
          sx={{
            '@keyframes shimmer': {
              '0%': { transform: 'translateX(-100%)' },
              '100%': { transform: 'translateX(200%)' }
            }
          }}
        />
      )}
    </Box>
  );
};