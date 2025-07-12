import { NextRequest, NextResponse } from 'next/server';
import { processDocument } from '@/utils/documentProcessor';
import { transcriptionService } from '@/utils/transcriptionService';
import { embeddingService } from '@/utils/embeddingService';
import { supabaseServer } from '@/utils/supabase/serverClients';

export async function POST(request: NextRequest) {
  try {
    const { documentId, action } = await request.json();

    if (!documentId) {
      return NextResponse.json(
        { error: 'Document ID is required' },
        { status: 400 }
      );
    }

    switch (action) {
      case 'process_text':
        // Process text documents (PDF, DOCX, TXT)
        await processDocument(documentId);
        break;

      case 'transcribe':
        // Transcribe audio/video documents
        await transcriptionService.processAudioVideoDocument(documentId);
        break;

      case 'embed':
        // Generate embeddings for documents
        await embeddingService.processDocumentForEmbedding(documentId);
        break;

      case 'process_all':
        // Process text documents first
        await processDocument(documentId);
        
        // Check if it needs transcription (for audio/video)
        const { data: document } = await supabaseServer
          .from('documents')
          .select('media_type')
          .eq('id', documentId)
          .single();

        if (document && (document.media_type === 'audio' || document.media_type === 'video')) {
          await transcriptionService.processAudioVideoDocument(documentId);
        }

        // Generate embedding
        await embeddingService.processDocumentForEmbedding(documentId);
        break;

      default:
        return NextResponse.json(
          { error: 'Invalid action. Use: process_text, transcribe, embed, or process_all' },
          { status: 400 }
        );
    }

    return NextResponse.json(
      { success: true, message: `Document ${action} completed successfully` },
      { status: 200 }
    );

  } catch (error) {
    console.error('Document processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Get processing status for all documents
    const { data: documents, error } = await supabaseServer
      .from('documents')
      .select('id,title,media_type,transcription_status,content_text,transcription,embedding,created_at');

    if (error) {
      throw error;
    }

    return NextResponse.json({ documents }, { status: 200 });

  } catch (error) {
    console.error('Error fetching document status:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
} 