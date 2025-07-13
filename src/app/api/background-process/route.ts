import { NextRequest, NextResponse } from 'next/server';
import { processAllPendingDocuments } from '@/utils/documentProcessor';
import { transcriptionService } from '@/utils/transcriptionService';
import { embeddingService } from '@/utils/embeddingService';
import { supabaseServer } from '@/utils/supabase/serverClients';

// This endpoint is designed to be called by a cron job or serverless function
// It processes all pending documents automatically
export async function POST(request: NextRequest) {
  try {
    // Optional: Add authentication/authorization here
    // For now, we'll use a simple API key check
    const authHeader = request.headers.get('authorization');
    const expectedKey = process.env.BACKGROUND_PROCESS_API_KEY;
    
    if (expectedKey && authHeader !== `Bearer ${expectedKey}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    const { action } = await request.json();
    
    let results = {
      processed: 0,
      errors: 0,
      details: [] as string[]
    };

    switch (action) {
      case 'process_text':
        // Process all pending text documents
        console.log('Starting background text processing...');
        await processAllPendingDocuments();
        results.details.push('Text processing completed');
        break;

      case 'process_transcriptions':
        // Process all pending audio/video transcriptions
        console.log('Starting background transcription processing...');
        await transcriptionService.processAllPendingAudioVideoDocuments();
        results.details.push('Transcription processing completed');
        break;

      case 'process_embeddings':
        // Process all pending embeddings
        console.log('Starting background embedding processing...');
        await embeddingService.processAllDocumentsForEmbedding();
        results.details.push('Embedding processing completed');
        break;

      case 'process_all':
        // Process everything in the correct order
        console.log('Starting complete background processing...');
        
        // 1. Process text documents first
        await processAllPendingDocuments();
        results.details.push('Text processing completed');
        
        // 2. Process transcriptions
        await transcriptionService.processAllPendingAudioVideoDocuments();
        results.details.push('Transcription processing completed');
        
        // 3. Process embeddings
        await embeddingService.processAllDocumentsForEmbedding();
        results.details.push('Embedding processing completed');
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: process_text, process_transcriptions, process_embeddings, or process_all' },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      message: `Background processing completed for action: ${action}`,
      results
    }, { status: 200 });

  } catch (error) {
    console.error('Background processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// GET endpoint to check processing status
export async function GET() {
  try {
    // Get processing status for all documents
    const { data: documents, error } = await supabaseServer
      .from('documents')
      .select('id,title,media_type,transcription_status,content_text,transcription,embedding,file_path,created_at');

    if (error) {
      throw error;
    }

    // Calculate processing statistics
    const stats = {
      total: documents?.length || 0,
      pending: documents?.filter((doc: any) => !doc.transcription_status || doc.transcription_status === 'pending').length || 0,
      completed: documents?.filter((doc: any) => doc.transcription_status === 'completed').length || 0,
      error: documents?.filter((doc: any) => doc.transcription_status === 'error').length || 0,
      withContent: documents?.filter((doc: any) => doc.content_text).length || 0,
      withTranscription: documents?.filter((doc: any) => doc.transcription).length || 0,
      withEmbedding: documents?.filter((doc: any) => doc.embedding).length || 0
    };

    return NextResponse.json({ 
      documents: documents || [],
      stats,
      pendingCount: stats.pending
    }, { status: 200 });

  } catch (error) {
    console.error('Error fetching processing status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 