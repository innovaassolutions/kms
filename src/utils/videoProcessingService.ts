import { createClient } from '@supabase/supabase-js';
import { monitoringService } from './monitoringService';
import * as fs from 'fs';
import * as path from 'path';
import { spawn } from 'child_process';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export interface VideoFrame {
  id: string;
  documentId: string;
  timestamp: number; // seconds
  frameNumber: number;
  frameUrl: string;
  thumbnail?: string;
  width: number;
  height: number;
  extractedAt: Date;
  processingStatus: 'pending' | 'processing' | 'completed' | 'error';
  metadata: {
    scene_change_score?: number;
    motion_score?: number;
    brightness?: number;
    contrast?: number;
    [key: string]: any;
  };
}

export interface OCRResult {
  text: string;
  confidence: number;
  boundingBoxes: BoundingBox[];
  language?: string;
  wordCount: number;
}

export interface BoundingBox {
  text: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FrameExtractionOptions {
  maxFrames?: number;
  intervalSeconds?: number;
  minSceneChangeThreshold?: number;
  outputFormat?: 'jpg' | 'png' | 'webp';
  quality?: number; // 1-100
  thumbnailSize?: { width: number; height: number };
  enableSmartSampling?: boolean;
}

export interface VideoAnalysisResult {
  duration: number;
  frameRate: number;
  width: number;
  height: number;
  totalFrames: number;
  extractedFrames: VideoFrame[];
  keyScenes: number[]; // timestamps of key scenes
  averageSceneLength: number;
}

export class VideoProcessingService {
  private readonly TEMP_DIR = '/tmp/kms-video-processing';
  private readonly MAX_CONCURRENT_EXTRACTIONS = 3;
  private currentExtractions = 0;

  constructor() {
    this.ensureTempDirectory();
  }

  /**
   * Extract frames from video with intelligent scene detection
   */
  async extractFrames(
    documentId: string,
    videoFilePath: string,
    options: FrameExtractionOptions = {}
  ): Promise<VideoAnalysisResult> {
    return await monitoringService.timeFunction(
      'extract_video_frames',
      'video_processing',
      async () => {
        if (this.currentExtractions >= this.MAX_CONCURRENT_EXTRACTIONS) {
          throw new Error('Maximum concurrent extractions reached. Please try again later.');
        }

        this.currentExtractions++;
        
        try {
          // Default options
          const opts: Required<FrameExtractionOptions> = {
            maxFrames: options.maxFrames || 100,
            intervalSeconds: options.intervalSeconds || 30,
            minSceneChangeThreshold: options.minSceneChangeThreshold || 0.3,
            outputFormat: options.outputFormat || 'jpg',
            quality: options.quality || 85,
            thumbnailSize: options.thumbnailSize || { width: 320, height: 240 },
            enableSmartSampling: options.enableSmartSampling ?? true,
          };

          await monitoringService.log({
            level: 'info',
            component: 'video_processing',
            action: 'extract_frames_start',
            message: `Starting frame extraction for document ${documentId}`,
            metadata: { options: opts },
          });

          // Analyze video metadata
          const videoInfo = await this.analyzeVideo(videoFilePath);
          
          // Extract frames using intelligent sampling
          const frames = opts.enableSmartSampling 
            ? await this.extractFramesWithSceneDetection(documentId, videoFilePath, videoInfo, opts)
            : await this.extractFramesWithInterval(documentId, videoFilePath, videoInfo, opts);

          // Upload frames to storage
          const uploadedFrames = await this.uploadFramesToStorage(frames);

          // Store frame metadata in database
          await this.storeFrameMetadata(uploadedFrames);

          const result: VideoAnalysisResult = {
            duration: videoInfo.duration,
            frameRate: videoInfo.frameRate,
            width: videoInfo.width,
            height: videoInfo.height,
            totalFrames: videoInfo.totalFrames,
            extractedFrames: uploadedFrames,
            keyScenes: this.identifyKeyScenes(uploadedFrames),
            averageSceneLength: videoInfo.duration / Math.max(uploadedFrames.length, 1),
          };

          await monitoringService.log({
            level: 'info',
            component: 'video_processing',
            action: 'extract_frames_complete',
            message: `Extracted ${uploadedFrames.length} frames from video`,
            metadata: { 
              documentId,
              framesExtracted: uploadedFrames.length,
              duration: videoInfo.duration 
            },
          });

          return result;

        } finally {
          this.currentExtractions--;
        }
      }
    );
  }

  /**
   * Perform OCR on a video frame
   */
  async performOCR(frameUrl: string, frameId: string): Promise<OCRResult> {
    return await monitoringService.timeFunction(
      'frame_ocr',
      'video_processing',
      async () => {
        try {
          // Download frame from storage
          const frameBuffer = await this.downloadFrame(frameUrl);
          
          // Perform OCR using multiple methods for better accuracy
          const ocrResults = await Promise.allSettled([
            this.performTesseractOCR(frameBuffer),
            this.performCloudVisionOCR(frameBuffer), // If available
          ]);

          // Use the best result
          const successfulResults = ocrResults
            .filter(result => result.status === 'fulfilled')
            .map(result => (result as PromiseFulfilledResult<OCRResult>).value);

          if (successfulResults.length === 0) {
            throw new Error('All OCR methods failed');
          }

          // Return result with highest confidence
          const bestResult = successfulResults.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          );

          await monitoringService.log({
            level: 'info',
            component: 'video_processing',
            action: 'ocr_complete',
            message: `OCR completed for frame ${frameId}`,
            metadata: { 
              frameId,
              confidence: bestResult.confidence,
              wordCount: bestResult.wordCount,
              textLength: bestResult.text.length 
            },
          });

          return bestResult;

        } catch (error) {
          await monitoringService.log({
            level: 'error',
            component: 'video_processing',
            action: 'ocr_failed',
            message: `OCR failed for frame ${frameId}: ${error instanceof Error ? error.message : 'Unknown error'}`,
            metadata: { frameId, error },
          });
          throw error;
        }
      }
    );
  }

  /**
   * Process all frames of a video (extract + OCR)
   */
  async processVideoComplete(
    documentId: string,
    videoFilePath: string,
    options: FrameExtractionOptions = {}
  ): Promise<{ analysis: VideoAnalysisResult; ocrResults: Map<string, OCRResult> }> {
    const analysis = await this.extractFrames(documentId, videoFilePath, options);
    const ocrResults = new Map<string, OCRResult>();

    // Process OCR for each frame in batches
    const batchSize = 5;
    for (let i = 0; i < analysis.extractedFrames.length; i += batchSize) {
      const batch = analysis.extractedFrames.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async frame => {
        try {
          const ocrResult = await this.performOCR(frame.frameUrl, frame.id);
          ocrResults.set(frame.id, ocrResult);
          return { frameId: frame.id, success: true };
        } catch (error) {
          return { frameId: frame.id, success: false, error };
        }
      });

      await Promise.allSettled(batchPromises);
      
      // Add delay between batches to avoid overwhelming the system
      if (i + batchSize < analysis.extractedFrames.length) {
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    return { analysis, ocrResults };
  }

  /**
   * Private helper methods
   */
  private async analyzeVideo(videoFilePath: string): Promise<{
    duration: number;
    frameRate: number;
    width: number;
    height: number;
    totalFrames: number;
  }> {
    return new Promise((resolve, reject) => {
      const ffprobe = spawn('ffprobe', [
        '-v', 'quiet',
        '-print_format', 'json',
        '-show_format',
        '-show_streams',
        videoFilePath
      ]);

      let output = '';
      ffprobe.stdout.on('data', (data) => {
        output += data.toString();
      });

      ffprobe.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`ffprobe failed with code ${code}`));
          return;
        }

        try {
          const info = JSON.parse(output);
          const videoStream = info.streams.find((s: any) => s.codec_type === 'video');
          
          if (!videoStream) {
            reject(new Error('No video stream found'));
            return;
          }

          const duration = parseFloat(info.format.duration);
          const frameRate = eval(videoStream.r_frame_rate); // e.g., "30/1"
          
          resolve({
            duration,
            frameRate,
            width: videoStream.width,
            height: videoStream.height,
            totalFrames: Math.floor(duration * frameRate),
          });
        } catch (error) {
          reject(new Error(`Failed to parse video info: ${error}`));
        }
      });

      ffprobe.on('error', reject);
    });
  }

  private async extractFramesWithSceneDetection(
    documentId: string,
    videoFilePath: string,
    videoInfo: any,
    options: Required<FrameExtractionOptions>
  ): Promise<VideoFrame[]> {
    const outputDir = path.join(this.TEMP_DIR, documentId);
    await fs.promises.mkdir(outputDir, { recursive: true });

    return new Promise((resolve, reject) => {
      const outputPattern = path.join(outputDir, 'frame_%04d.jpg');
      
      // Use ffmpeg with scene detection
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoFilePath,
        '-vf', `select='gt(scene,${options.minSceneChangeThreshold})',scale=640:480`,
        '-vsync', 'vfr',
        '-q:v', options.quality.toString(),
        '-frames:v', options.maxFrames.toString(),
        outputPattern,
        '-y' // Overwrite output files
      ]);

      ffmpeg.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg scene detection failed with code ${code}`));
          return;
        }

        try {
          const frameFiles = await fs.promises.readdir(outputDir);
          const frames: VideoFrame[] = [];

          for (const fileName of frameFiles.sort()) {
            const frameNumber = parseInt(fileName.match(/frame_(\d+)/)?.[1] || '0');
            const timestamp = (frameNumber / videoInfo.frameRate);
            
            frames.push({
              id: `${documentId}_frame_${frameNumber}`,
              documentId,
              timestamp,
              frameNumber,
              frameUrl: '', // Will be set after upload
              width: 640,
              height: 480,
              extractedAt: new Date(),
              processingStatus: 'pending',
              metadata: {
                scene_change_score: options.minSceneChangeThreshold,
                extraction_method: 'scene_detection',
              },
            });
          }

          resolve(frames);
        } catch (error) {
          reject(error);
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  private async extractFramesWithInterval(
    documentId: string,
    videoFilePath: string,
    videoInfo: any,
    options: Required<FrameExtractionOptions>
  ): Promise<VideoFrame[]> {
    const outputDir = path.join(this.TEMP_DIR, documentId);
    await fs.promises.mkdir(outputDir, { recursive: true });

    const maxFrames = Math.min(
      options.maxFrames,
      Math.floor(videoInfo.duration / options.intervalSeconds)
    );

    return new Promise((resolve, reject) => {
      const outputPattern = path.join(outputDir, 'frame_%04d.jpg');
      
      const ffmpeg = spawn('ffmpeg', [
        '-i', videoFilePath,
        '-vf', `fps=1/${options.intervalSeconds},scale=640:480`,
        '-q:v', options.quality.toString(),
        '-frames:v', maxFrames.toString(),
        outputPattern,
        '-y'
      ]);

      ffmpeg.on('close', async (code) => {
        if (code !== 0) {
          reject(new Error(`ffmpeg interval extraction failed with code ${code}`));
          return;
        }

        try {
          const frameFiles = await fs.promises.readdir(outputDir);
          const frames: VideoFrame[] = [];

          for (let i = 0; i < frameFiles.length; i++) {
            const timestamp = i * options.intervalSeconds;
            
            frames.push({
              id: `${documentId}_frame_${i}`,
              documentId,
              timestamp,
              frameNumber: i,
              frameUrl: '', // Will be set after upload
              width: 640,
              height: 480,
              extractedAt: new Date(),
              processingStatus: 'pending',
              metadata: {
                interval_seconds: options.intervalSeconds,
                extraction_method: 'interval',
              },
            });
          }

          resolve(frames);
        } catch (error) {
          reject(error);
        }
      });

      ffmpeg.on('error', reject);
    });
  }

  private async uploadFramesToStorage(frames: VideoFrame[]): Promise<VideoFrame[]> {
    const uploadedFrames: VideoFrame[] = [];
    
    for (const frame of frames) {
      try {
        const frameFile = path.join(this.TEMP_DIR, frame.documentId, `frame_${frame.frameNumber.toString().padStart(4, '0')}.jpg`);
        
        if (!fs.existsSync(frameFile)) {
          continue;
        }

        const fileBuffer = await fs.promises.readFile(frameFile);
        const fileName = `${frame.documentId}/frames/${frame.id}.jpg`;
        
        const { data, error } = await supabase.storage
          .from('documents')
          .upload(fileName, fileBuffer, {
            contentType: 'image/jpeg',
            upsert: true,
          });

        if (error) {
          throw error;
        }

        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        uploadedFrames.push({
          ...frame,
          frameUrl: urlData.publicUrl,
          processingStatus: 'completed',
        });

        // Clean up temp file
        await fs.promises.unlink(frameFile);

      } catch (error) {
        console.error(`Failed to upload frame ${frame.id}:`, error);
        uploadedFrames.push({
          ...frame,
          processingStatus: 'error',
          metadata: {
            ...frame.metadata,
            error: error instanceof Error ? error.message : 'Upload failed',
          },
        });
      }
    }

    return uploadedFrames;
  }

  private async storeFrameMetadata(frames: VideoFrame[]): Promise<void> {
    if (frames.length === 0) return;

    try {
      const { error } = await supabase
        .from('video_frames')
        .upsert(frames.map(frame => ({
          id: frame.id,
          document_id: frame.documentId,
          timestamp: frame.timestamp,
          frame_number: frame.frameNumber,
          frame_url: frame.frameUrl,
          width: frame.width,
          height: frame.height,
          extracted_at: frame.extractedAt.toISOString(),
          processing_status: frame.processingStatus,
          metadata: frame.metadata,
        })));

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Failed to store frame metadata:', error);
      throw error;
    }
  }

  private identifyKeyScenes(frames: VideoFrame[]): number[] {
    // Simple key scene identification based on frame distribution
    const keyScenes: number[] = [];
    const totalDuration = Math.max(...frames.map(f => f.timestamp));
    const sceneCount = Math.min(10, frames.length);
    
    for (let i = 0; i < sceneCount; i++) {
      const timestamp = (i / (sceneCount - 1)) * totalDuration;
      keyScenes.push(timestamp);
    }
    
    return keyScenes;
  }

  private async downloadFrame(frameUrl: string): Promise<Buffer> {
    const response = await fetch(frameUrl);
    if (!response.ok) {
      throw new Error(`Failed to download frame: ${response.statusText}`);
    }
    return Buffer.from(await response.arrayBuffer());
  }

  private async performTesseractOCR(imageBuffer: Buffer): Promise<OCRResult> {
    // This would integrate with Tesseract.js or similar
    // For now, returning a mock implementation
    return {
      text: '',
      confidence: 0,
      boundingBoxes: [],
      wordCount: 0,
    };
  }

  private async performCloudVisionOCR(imageBuffer: Buffer): Promise<OCRResult> {
    // This would integrate with Google Cloud Vision or similar
    // For now, returning a mock implementation
    return {
      text: '',
      confidence: 0,
      boundingBoxes: [],
      wordCount: 0,
    };
  }

  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.TEMP_DIR)) {
      fs.mkdirSync(this.TEMP_DIR, { recursive: true });
    }
  }

  /**
   * Cleanup methods
   */
  async cleanupTempFiles(documentId?: string): Promise<void> {
    try {
      if (documentId) {
        const docDir = path.join(this.TEMP_DIR, documentId);
        if (fs.existsSync(docDir)) {
          await fs.promises.rm(docDir, { recursive: true });
        }
      } else {
        // Clean all temp files older than 1 hour
        const dirs = await fs.promises.readdir(this.TEMP_DIR);
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        
        for (const dir of dirs) {
          const dirPath = path.join(this.TEMP_DIR, dir);
          const stats = await fs.promises.stat(dirPath);
          
          if (stats.mtime.getTime() < oneHourAgo) {
            await fs.promises.rm(dirPath, { recursive: true });
          }
        }
      }
    } catch (error) {
      console.error('Failed to cleanup temp files:', error);
    }
  }
}

// Export singleton instance
export const videoProcessingService = new VideoProcessingService();