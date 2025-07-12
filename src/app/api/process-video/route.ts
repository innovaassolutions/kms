import { NextRequest, NextResponse } from 'next/server';
import { videoProcessingService } from '@/utils/videoProcessingService';
import { claudeVisionService } from '@/utils/claudeVisionService';
import { embeddingService } from '@/utils/enhancedEmbeddingService';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { monitoringService } from '@/utils/monitoringService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      documentId, 
      options = {},
      enableVisionAnalysis = true,
      enableEmbeddings = true,
      processingMode = 'complete' // 'frames_only', 'vision_only', 'complete'
    } = body;

    // Validate required parameters
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    await monitoringService.log({
      level: 'info',
      component: 'video_processing',
      action: 'process_video_start',
      message: `Starting video processing for document ${documentId}`,
      metadata: { documentId, processingMode, enableVisionAnalysis, enableEmbeddings },
    });

    // Get document information
    const { data: document, error: docError } = await supabaseServer
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (docError || !document) {
      return NextResponse.json(
        { error: 'Document not found' },
        { status: 404 }
      );
    }

    // Verify it's a video document
    if (document.media_type !== 'video') {
      return NextResponse.json(
        { error: 'Document is not a video file' },
        { status: 400 }
      );
    }

    // Download video file from storage
    const { data: fileData, error: downloadError } = await supabaseServer.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      return NextResponse.json(
        { error: 'Failed to download video file' },
        { status: 500 }
      );
    }

    // Save video to temporary file for processing
    const tempFilePath = `/tmp/${documentId}_video.${document.file_path.split('.').pop()}`;
    const buffer = Buffer.from(await fileData.arrayBuffer());
    
    // Write to filesystem temporarily (in production, consider using streaming)
    const fs = require('fs');
    fs.writeFileSync(tempFilePath, buffer);

    let result: any = {
      documentId,
      processingMode,
      frames: [],
      visionAnalysis: {},
      embeddings: {},
      scenes: [],
      technicalContent: [],
    };

    try {
      // Step 1: Extract frames (if not vision_only mode)
      if (processingMode !== 'vision_only') {
        const frameExtractionResult = await videoProcessingService.extractFrames(
          documentId,
          tempFilePath,
          options
        );

        result.videoAnalysis = {
          duration: frameExtractionResult.duration,
          frameRate: frameExtractionResult.frameRate,
          width: frameExtractionResult.width,
          height: frameExtractionResult.height,
          totalFrames: frameExtractionResult.totalFrames,
          extractedFrames: frameExtractionResult.extractedFrames.length,
          keyScenes: frameExtractionResult.keyScenes,
        };

        result.frames = frameExtractionResult.extractedFrames;

        await monitoringService.log({
          level: 'info',
          component: 'video_processing',
          action: 'frame_extraction_complete',
          message: `Extracted ${frameExtractionResult.extractedFrames.length} frames`,
          metadata: { documentId, framesCount: frameExtractionResult.extractedFrames.length },
        });
      }

      // Step 2: Vision analysis with Claude (if enabled)
      if (enableVisionAnalysis && result.frames.length > 0) {
        const visionResults = new Map();
        const technicalContent = [];
        const scenes = [];
        
        // Process frames in batches
        const batchSize = 5;
        for (let i = 0; i < result.frames.length; i += batchSize) {
          const batch = result.frames.slice(i, i + batchSize);
          
          const batchPromises = batch.map(async (frame: any) => {
            try {
              // Download frame for analysis
              const frameResponse = await fetch(frame.frameUrl);
              const frameBuffer = Buffer.from(await frameResponse.arrayBuffer());
              
              // Analyze with Claude Vision
              const analysis = await claudeVisionService.analyzeFrame(
                frameBuffer,
                frame.id,
                {
                  focusAreas: ['code', 'diagrams', 'ui', 'text'],
                  detailLevel: 'high',
                  extractCode: true,
                  identifyTechnicalTerms: true,
                }
              );

              return { frameId: frame.id, analysis, frame };
            } catch (error) {
              console.error(`Vision analysis failed for frame ${frame.id}:`, error);
              return { frameId: frame.id, error, frame };
            }
          });

          const batchResults = await Promise.allSettled(batchPromises);
          
          for (const result of batchResults) {
            if (result.status === 'fulfilled' && result.value.analysis) {
              const { frameId, analysis, frame } = result.value;
              visionResults.set(frameId, analysis);

              // Store technical content if found
              if (analysis.technicalContent.containsCode || 
                  analysis.technicalContent.containsDiagrams || 
                  analysis.technicalContent.containsUI) {
                technicalContent.push({
                  frameId,
                  timestamp: frame.timestamp,
                  ...analysis.technicalContent,
                });
              }

              // Update frame in database with analysis results
              await supabaseServer
                .from('video_frames')
                .update({
                  ocr_text: analysis.textContent.extractedText,
                  ocr_confidence: analysis.textContent.confidence,
                  contains_code: analysis.technicalContent.containsCode,
                  contains_diagrams: analysis.technicalContent.containsDiagrams,
                  contains_ui_elements: analysis.technicalContent.containsUI,
                  contains_text: analysis.textContent.extractedText.length > 0,
                  processing_status: 'completed',
                })
                .eq('id', frameId);

              // Store detailed analysis
              await supabaseServer
                .from('frame_analysis')
                .insert({
                  frame_id: frameId,
                  analysis_type: 'technical_content',
                  provider: 'claude_vision',
                  confidence: analysis.confidence,
                  raw_response: analysis,
                  extracted_data: {
                    technicalContent: analysis.technicalContent,
                    textContent: analysis.textContent,
                    visualElements: analysis.visualElements,
                  },
                  processing_time_ms: analysis.processingTime,
                });
            }
          }

          // Add delay between batches
          if (i + batchSize < result.frames.length) {
            await new Promise(resolve => setTimeout(resolve, 3000));
          }
        }

        result.visionAnalysis = Object.fromEntries(visionResults);
        result.technicalContent = technicalContent;

        await monitoringService.log({
          level: 'info',
          component: 'video_processing',
          action: 'vision_analysis_complete',
          message: `Completed vision analysis for ${visionResults.size} frames`,
          metadata: { 
            documentId, 
            analyzedFrames: visionResults.size,
            technicalContentFound: technicalContent.length 
          },
        });
      }

      // Step 3: Generate embeddings (if enabled)
      if (enableEmbeddings && result.frames.length > 0) {
        const embeddingResults = new Map();
        
        for (const frame of result.frames) {
          try {
            const visionAnalysis = result.visionAnalysis[frame.id];
            if (!visionAnalysis) continue;

            // Generate text embedding from OCR text
            let textEmbedding = null;
            if (visionAnalysis.textContent.extractedText) {
              const textResult = await embeddingService.generateEmbedding(
                visionAnalysis.textContent.extractedText
              );
              textEmbedding = textResult.embedding;
            }

            // Generate combined embedding from description + technical content
            const combinedText = [
              visionAnalysis.description,
              visionAnalysis.textContent.extractedText,
              visionAnalysis.technicalContent.codeDescription,
              visionAnalysis.technicalContent.diagramDescription,
              ...visionAnalysis.technicalContent.technicalTerms,
            ].filter(Boolean).join(' ');

            let combinedEmbedding = null;
            if (combinedText) {
              const combinedResult = await embeddingService.generateEmbedding(combinedText);
              combinedEmbedding = combinedResult.embedding;
            }

            embeddingResults.set(frame.id, {
              textEmbedding,
              combinedEmbedding,
            });

            // Update frame with embeddings
            await supabaseServer
              .from('video_frames')
              .update({
                text_embedding: textEmbedding,
                combined_embedding: combinedEmbedding,
              })
              .eq('id', frame.id);

          } catch (error) {
            console.error(`Embedding generation failed for frame ${frame.id}:`, error);
          }
        }

        result.embeddings = Object.fromEntries(embeddingResults);

        await monitoringService.log({
          level: 'info',
          component: 'video_processing',
          action: 'embedding_generation_complete',
          message: `Generated embeddings for ${embeddingResults.size} frames`,
          metadata: { documentId, embeddedFrames: embeddingResults.size },
        });
      }

      // Update document processing status
      await supabaseServer
        .from('documents')
        .update({
          transcription_status: 'completed',
          processing_metadata: {
            ...document.processing_metadata,
            video_processing_completed: true,
            frames_extracted: result.frames.length,
            vision_analysis_completed: enableVisionAnalysis,
            embeddings_generated: enableEmbeddings,
            processed_at: new Date().toISOString(),
          },
        })
        .eq('id', documentId);

    } finally {
      // Cleanup temporary files
      try {
        fs.unlinkSync(tempFilePath);
        await videoProcessingService.cleanupTempFiles(documentId);
      } catch (error) {
        console.error('Cleanup error:', error);
      }
    }

    await monitoringService.log({
      level: 'info',
      component: 'video_processing',
      action: 'process_video_complete',
      message: `Video processing completed for document ${documentId}`,
      metadata: { 
        documentId,
        framesProcessed: result.frames.length,
        technicalContentFound: result.technicalContent.length,
        processingMode,
      },
    });

    return NextResponse.json({
      success: true,
      data: result,
      metadata: {
        processingMode,
        framesProcessed: result.frames.length,
        visionAnalysisEnabled: enableVisionAnalysis,
        embeddingsEnabled: enableEmbeddings,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Video processing error:', error);

    await monitoringService.log({
      level: 'error',
      component: 'video_processing',
      action: 'process_video_failed',
      message: `Video processing failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error },
    });
    
    return NextResponse.json(
      { 
        error: 'Video processing failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const documentId = searchParams.get('documentId');
    
    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    // Get processing status and results
    const { data: frames, error: framesError } = await supabaseServer
      .from('video_frames')
      .select(`
        *,
        frame_analysis(*),
        frame_technical_content(*)
      `)
      .eq('document_id', documentId)
      .order('timestamp', { ascending: true });

    if (framesError) {
      throw framesError;
    }

    const { data: scenes, error: scenesError } = await supabaseServer
      .from('video_scenes')
      .select('*')
      .eq('document_id', documentId)
      .order('scene_number', { ascending: true });

    if (scenesError) {
      throw scenesError;
    }

    return NextResponse.json({
      success: true,
      data: {
        documentId,
        frames: frames || [],
        scenes: scenes || [],
        summary: {
          totalFrames: frames?.length || 0,
          framesWithCode: frames?.filter(f => f.contains_code).length || 0,
          framesWithDiagrams: frames?.filter(f => f.contains_diagrams).length || 0,
          framesWithUI: frames?.filter(f => f.contains_ui_elements).length || 0,
          totalScenes: scenes?.length || 0,
        },
      },
    });

  } catch (error) {
    console.error('Get video processing status error:', error);
    
    return NextResponse.json(
      { 
        error: 'Failed to get video processing status',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}