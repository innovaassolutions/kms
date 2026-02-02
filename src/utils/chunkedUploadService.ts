import { supabase } from '@/utils/supabase/client';

export interface UploadProgress {
  uploadedBytes: number;
  totalBytes: number;
  percentage: number;
  speed: number; // bytes per second
  remainingTime: number; // seconds
  chunkIndex: number;
  totalChunks: number;
}

export interface ChunkedUploadOptions {
  chunkSize?: number; // Default 10MB chunks
  maxRetries?: number;
  onProgress?: (progress: UploadProgress) => void;
  onChunkComplete?: (chunkIndex: number, totalChunks: number) => void;
}

interface UploadSession {
  sessionId: string;
  uploadId: string;
  chunks: string[];
}

export class ChunkedUploadService {
  private static readonly DEFAULT_CHUNK_SIZE = 10 * 1024 * 1024; // 10MB
  private static readonly MAX_RETRIES = 3;

  static async uploadFile(
    file: File,
    filePath: string,
    options: ChunkedUploadOptions & { metadata?: any } = {}
  ): Promise<{ data: any; error: any }> {
    const {
      chunkSize = this.DEFAULT_CHUNK_SIZE,
      maxRetries = this.MAX_RETRIES,
      onProgress,
      onChunkComplete,
      metadata
    } = options;

    // For small files (< 50MB), use direct upload
    if (file.size < 50 * 1024 * 1024) {
      return this.directUpload(file, filePath, onProgress);
    }

    // For large files, use chunked upload
    return this.chunkedUpload(file, filePath, {
      chunkSize,
      maxRetries,
      onProgress: onProgress || (() => {}),
      onChunkComplete: onChunkComplete || (() => {}),
      metadata
    });
  }

  private static async directUpload(
    file: File,
    filePath: string,
    onProgress?: (progress: UploadProgress) => void
  ): Promise<{ data: any; error: any }> {
    const startTime = Date.now();
    let uploadedBytes = 0;

    // Simulate progress for direct uploads
    const progressInterval = setInterval(() => {
      if (onProgress && uploadedBytes < file.size) {
        uploadedBytes = Math.min(uploadedBytes + file.size / 10, file.size);
        const elapsed = (Date.now() - startTime) / 1000;
        const speed = uploadedBytes / elapsed;
        const remainingTime = speed > 0 ? (file.size - uploadedBytes) / speed : 0;

        onProgress({
          uploadedBytes,
          totalBytes: file.size,
          percentage: (uploadedBytes / file.size) * 100,
          speed,
          remainingTime,
          chunkIndex: 1,
          totalChunks: 1
        });
      }
    }, 500);

    try {
      const result = await supabase.storage
        .from('documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true
        });

      clearInterval(progressInterval);

      // Final progress update
      if (onProgress) {
        onProgress({
          uploadedBytes: file.size,
          totalBytes: file.size,
          percentage: 100,
          speed: file.size / ((Date.now() - startTime) / 1000),
          remainingTime: 0,
          chunkIndex: 1,
          totalChunks: 1
        });
      }

      return result;
    } catch (error) {
      clearInterval(progressInterval);
      return { data: null, error };
    }
  }

  private static async chunkedUpload(
    file: File,
    filePath: string,
    options: Required<ChunkedUploadOptions> & { metadata?: any }
  ): Promise<{ data: any; error: any }> {
    const { chunkSize, maxRetries, onProgress, onChunkComplete, metadata } = options;
    const totalChunks = Math.ceil(file.size / chunkSize);
    const startTime = Date.now();
    let uploadedBytes = 0;

    try {
      // Initialize multipart upload
      const uploadSession = await this.initializeMultipartUpload();
      
      const uploadPromises: Promise<void>[] = [];
      const chunks: { index: number; etag: string }[] = [];

      // Upload chunks in parallel (limit to 3 concurrent uploads)
      const semaphore = new Semaphore(3);

      for (let i = 0; i < totalChunks; i++) {
        const start = i * chunkSize;
        const end = Math.min(start + chunkSize, file.size);
        const chunk = file.slice(start, end);

        uploadPromises.push(
          semaphore.acquire().then(async (release) => {
            try {
              const etag = await this.uploadChunkWithRetry(
                uploadSession,
                chunk,
                i + 1,
                maxRetries
              );

              chunks[i] = { index: i + 1, etag };
              uploadedBytes += chunk.size;

              const elapsed = (Date.now() - startTime) / 1000;
              const speed = uploadedBytes / elapsed;
              const remainingTime = speed > 0 ? (file.size - uploadedBytes) / speed : 0;

              if (onProgress) {
                onProgress({
                  uploadedBytes,
                  totalBytes: file.size,
                  percentage: (uploadedBytes / file.size) * 100,
                  speed,
                  remainingTime,
                  chunkIndex: i + 1,
                  totalChunks
                });
              }

              if (onChunkComplete) {
                onChunkComplete(i + 1, totalChunks);
              }
            } finally {
              release();
            }
          })
        );
      }

      // Wait for all chunks to upload
      await Promise.all(uploadPromises);
      
      // Verify all chunks were uploaded successfully
      console.log(`All ${totalChunks} chunks uploaded, verifying...`);
      for (let i = 0; i < totalChunks; i++) {
        if (!chunks[i]) {
          throw new Error(`Chunk ${i + 1} failed to upload`);
        }
      }

      // Add a small delay to ensure all uploads are committed
      console.log('Waiting for uploads to be fully committed...');
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Complete multipart upload by combining chunks
      const uploadResult = await this.completeMultipartUpload(uploadSession, chunks, filePath, metadata);
      
      return { data: { path: filePath, chunksPath: uploadResult.chunksPath }, error: null };
    } catch (error) {
      console.error('Chunked upload failed:', error);
      return { data: null, error };
    }
  }

  private static async initializeMultipartUpload(): Promise<UploadSession> {
    // For Supabase, we'll simulate multipart upload using multiple single uploads
    // and then combine them. In a real implementation, you'd use actual multipart upload APIs
    const sessionId = crypto.randomUUID();
    return {
      sessionId,
      uploadId: sessionId,
      chunks: []
    };
  }

  private static async uploadChunkWithRetry(
    session: UploadSession,
    chunk: Blob,
    chunkIndex: number,
    maxRetries: number
  ): Promise<string> {
    let lastError: any;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        // For Supabase, upload each chunk as a separate file
        const chunkPath = `chunks/${session.sessionId}/chunk_${chunkIndex.toString().padStart(6, '0')}`;
        
        const { error } = await supabase.storage
          .from('documents')
          .upload(chunkPath, chunk, {
            cacheControl: '3600',
            upsert: true
          });

        if (error) throw error;
        
        // Return a simulated ETag
        return `etag_${chunkIndex}`;
      } catch (error) {
        lastError = error;
        if (attempt < maxRetries - 1) {
          // Exponential backoff
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 1000));
        }
      }
    }

    throw lastError;
  }

  private static async completeMultipartUpload(
    session: UploadSession,
    chunks: { index: number; etag: string }[],
    finalPath: string,
    metadata?: any
  ): Promise<any> {
    try {
      // For large files, use simpler approach to avoid memory issues
      console.log('Using simple chunk marking approach for large file...');
      const response = await fetch('/api/upload-chunks-simple', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'mark_ready',
          sessionId: session.sessionId,
          finalPath: finalPath,
          chunkCount: chunks.length,
          metadata
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark chunks as ready');
      }

      const result = await response.json();
      console.log('Chunks marked for background processing:', result.message);
      
      return { success: true, path: finalPath, chunksPath: result.chunksPath };
    } catch (error) {
      console.error('Failed to complete multipart upload:', error);
      throw error;
    }
  }
}

// Semaphore for controlling concurrent uploads
class Semaphore {
  private permits: number;
  private waiting: (() => void)[] = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<() => void> {
    return new Promise((resolve) => {
      if (this.permits > 0) {
        this.permits--;
        resolve(() => this.release());
      } else {
        this.waiting.push(() => {
          this.permits--;
          resolve(() => this.release());
        });
      }
    });
  }

  private release(): void {
    this.permits++;
    if (this.waiting.length > 0) {
      const next = this.waiting.shift()!;
      next();
    }
  }
}