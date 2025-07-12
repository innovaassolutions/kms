import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { embeddingService } from '@/utils/enhancedEmbeddingService';
import { claudeVisionService } from '@/utils/claudeVisionService';
import { monitoringService } from '@/utils/monitoringService';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query,
      queryType = 'text', // 'text', 'image', 'mixed'
      imageData, // base64 encoded image for image search
      searchMode = 'multimodal', // 'text_only', 'visual_only', 'multimodal'
      filters = {},
      maxResults = 20,
      visualWeight = 0.5,
      textWeight = 0.5,
      similarityThreshold = 0.3,
      includeFrameContext = false,
    } = body;

    // Validate input
    if (!query && !imageData) {
      return NextResponse.json(
        { error: 'Either text query or image data is required' },
        { status: 400 }
      );
    }

    await monitoringService.log({
      level: 'info',
      component: 'multimodal_search',
      action: 'search_start',
      message: `Starting multimodal search`,
      metadata: { queryType, searchMode, hasImage: !!imageData },
    });

    let textEmbedding: number[] | null = null;
    let visualEmbedding: number[] | null = null;
    let results: any[] = [];

    // Generate text embedding if we have a text query
    if (query && (searchMode === 'text_only' || searchMode === 'multimodal')) {
      const embeddingResult = await embeddingService.generateEmbedding(query);
      textEmbedding = embeddingResult.embedding;
    }

    // Generate visual embedding if we have image data
    if (imageData && (searchMode === 'visual_only' || searchMode === 'multimodal')) {
      try {
        // Decode base64 image
        const imageBuffer = Buffer.from(imageData, 'base64');
        
        // Analyze image with Claude Vision to get description
        const visionAnalysis = await claudeVisionService.analyzeFrame(
          imageBuffer,
          'search_query_image',
          {
            focusAreas: ['general', 'code', 'diagrams', 'ui'],
            detailLevel: 'medium',
          }
        );

        // Generate embedding from visual description
        const visualDescription = [
          visionAnalysis.description,
          ...visionAnalysis.technicalContent.technicalTerms,
          ...visionAnalysis.technicalContent.concepts,
          visionAnalysis.textContent.extractedText,
        ].filter(Boolean).join(' ');

        if (visualDescription) {
          const visualEmbeddingResult = await embeddingService.generateEmbedding(visualDescription);
          visualEmbedding = visualEmbeddingResult.embedding;
        }
      } catch (error) {
        console.error('Visual analysis failed:', error);
        // Continue with text-only search if visual analysis fails
      }
    }

    // Search video frames using multimodal similarity
    if (searchMode === 'multimodal' || searchMode === 'visual_only') {
      const { data: frameResults, error: frameError } = await supabaseServer.rpc(
        'search_video_frames_multimodal',
        {
          visual_embedding: visualEmbedding,
          text_embedding: textEmbedding,
          visual_weight: visualWeight,
          text_weight: textWeight,
          similarity_threshold: similarityThreshold,
          max_results: Math.floor(maxResults / 2), // Reserve half for document search
          content_filters: filters.contentTypes || null,
        }
      );

      if (frameError) {
        console.error('Frame search error:', frameError);
      } else if (frameResults) {
        results.push(...frameResults.map((frame: any) => ({
          type: 'video_frame',
          id: frame.frame_id,
          documentId: frame.document_id,
          title: `Frame at ${Math.floor(frame.timestamp)}s`,
          content: frame.ocr_text || '',
          frameUrl: frame.frame_url,
          timestamp: frame.timestamp,
          similarity: frame.combined_score,
          visualSimilarity: frame.visual_similarity,
          textSimilarity: frame.text_similarity,
          containsCode: frame.contains_code,
          containsDiagrams: frame.contains_diagrams,
        })));
      }
    }

    // Search regular documents
    if (searchMode === 'text_only' || searchMode === 'multimodal') {
      let documentQuery = supabaseServer
        .from('documents')
        .select(`
          id, title, type, content_text, transcription, tags, created_at,
          embedding, media_type
        `)
        .not('embedding', 'is', null);

      // Apply filters
      if (filters.documentTypes && filters.documentTypes.length > 0) {
        documentQuery = documentQuery.in('type', filters.documentTypes);
      }

      if (filters.mediaTypes && filters.mediaTypes.length > 0) {
        documentQuery = documentQuery.in('media_type', filters.mediaTypes);
      }

      if (filters.tags && filters.tags.length > 0) {
        documentQuery = documentQuery.overlaps('tags', filters.tags);
      }

      const { data: documents, error: docError } = await documentQuery
        .limit(maxResults);

      if (docError) {
        console.error('Document search error:', docError);
      } else if (documents && textEmbedding) {
        // Calculate similarities
        const docResults = documents
          .map(doc => {
            const similarity = calculateCosineSimilarity(textEmbedding!, doc.embedding);
            return {
              type: 'document',
              id: doc.id,
              title: doc.title,
              content: doc.content_text || doc.transcription || '',
              mediaType: doc.media_type,
              documentType: doc.type,
              tags: doc.tags,
              similarity,
              createdAt: doc.created_at,
            };
          })
          .filter(doc => doc.similarity > similarityThreshold)
          .sort((a, b) => b.similarity - a.similarity);

        results.push(...docResults);
      }
    }

    // Add frame context if requested
    if (includeFrameContext) {
      for (const result of results) {
        if (result.type === 'video_frame') {
          try {
            const { data: context } = await supabaseServer.rpc('get_document_context', {
              target_chunk_id: result.id,
              context_window: 2,
            });
            result.context = context || [];
          } catch (error) {
            console.error('Failed to get frame context:', error);
          }
        }
      }
    }

    // Sort all results by similarity
    results.sort((a, b) => b.similarity - a.similarity);
    results = results.slice(0, maxResults);

    // Get additional metadata for frames
    const frameIds = results
      .filter(r => r.type === 'video_frame')
      .map(r => r.id);

    if (frameIds.length > 0) {
      const { data: frameAnalysis } = await supabaseServer
        .from('frame_analysis')
        .select('frame_id, analysis_type, confidence, extracted_data')
        .in('frame_id', frameIds);

      const { data: technicalContent } = await supabaseServer
        .from('frame_technical_content')
        .select('frame_id, content_type, extracted_code, programming_language, confidence')
        .in('frame_id', frameIds);

      // Enrich frame results with analysis data
      results.forEach(result => {
        if (result.type === 'video_frame') {
          result.analysis = frameAnalysis?.filter(a => a.frame_id === result.id) || [];
          result.technicalContent = technicalContent?.filter(t => t.frame_id === result.id) || [];
        }
      });
    }

    await monitoringService.log({
      level: 'info',
      component: 'multimodal_search',
      action: 'search_complete',
      message: `Multimodal search completed`,
      metadata: { 
        resultsCount: results.length,
        frameResults: results.filter(r => r.type === 'video_frame').length,
        documentResults: results.filter(r => r.type === 'document').length,
        searchMode,
      },
    });

    return NextResponse.json({
      success: true,
      data: {
        query,
        results,
        searchMode,
        summary: {
          totalResults: results.length,
          frameResults: results.filter(r => r.type === 'video_frame').length,
          documentResults: results.filter(r => r.type === 'document').length,
          avgSimilarity: results.length > 0 
            ? results.reduce((sum, r) => sum + r.similarity, 0) / results.length 
            : 0,
        },
      },
      metadata: {
        searchMode,
        visualWeight,
        textWeight,
        similarityThreshold,
        hasVisualQuery: !!visualEmbedding,
        hasTextQuery: !!textEmbedding,
        timestamp: new Date().toISOString(),
      },
    });

  } catch (error) {
    console.error('Multimodal search error:', error);

    await monitoringService.log({
      level: 'error',
      component: 'multimodal_search',
      action: 'search_failed',
      message: `Multimodal search failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      metadata: { error },
    });
    
    return NextResponse.json(
      { 
        error: 'Multimodal search failed',
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
    const query = searchParams.get('q') || searchParams.get('query');
    const searchMode = searchParams.get('mode') || 'multimodal';
    const maxResults = parseInt(searchParams.get('limit') || '20');
    const contentTypes = searchParams.get('contentTypes')?.split(',');
    
    if (!query) {
      return NextResponse.json(
        { error: 'Query parameter is required' },
        { status: 400 }
      );
    }

    // Convert GET to POST format
    const searchBody = {
      query,
      queryType: 'text',
      searchMode,
      maxResults,
      filters: {
        contentTypes,
      },
    };

    // Re-use POST logic
    return await POST(new NextRequest(request.url, {
      method: 'POST',
      body: JSON.stringify(searchBody),
      headers: { 'Content-Type': 'application/json' },
    }));

  } catch (error) {
    console.error('Multimodal GET search error:', error);
    
    return NextResponse.json(
      { 
        error: 'Multimodal search failed',
        message: error instanceof Error ? error.message : 'Unknown error',
        success: false 
      },
      { status: 500 }
    );
  }
}

// Helper function for cosine similarity calculation
function calculateCosineSimilarity(vectorA: number[], vectorB: number[]): number {
  if (!vectorA || !vectorB || vectorA.length !== vectorB.length) {
    return 0;
  }
  
  let dotProduct = 0;
  let normA = 0;
  let normB = 0;
  
  for (let i = 0; i < vectorA.length; i++) {
    dotProduct += vectorA[i] * vectorB[i];
    normA += vectorA[i] * vectorA[i];
    normB += vectorB[i] * vectorB[i];
  }
  
  normA = Math.sqrt(normA);
  normB = Math.sqrt(normB);
  
  if (normA === 0 || normB === 0) {
    return 0;
  }
  
  return dotProduct / (normA * normB);
}