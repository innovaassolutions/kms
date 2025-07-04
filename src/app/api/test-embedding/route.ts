import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';
import { embeddingService } from '@/utils/embeddingService';

export async function POST(request: NextRequest) {
  try {
    const { documentId } = await request.json();
    
    if (!documentId) {
      return NextResponse.json({ error: 'Document ID required' }, { status: 400 });
    }

    // Get the document
    const { data: doc, error } = await supabaseServer
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (error || !doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const analysis = {
      documentId: doc.id,
      title: doc.title,
      hasContent: !!(doc.content_text || doc.transcription),
      contentLength: (doc.content_text || doc.transcription || '').length,
      contentPreview: (doc.content_text || doc.transcription || '').substring(0, 200),
      embeddingExists: !!doc.embedding,
      embeddingType: typeof doc.embedding,
      embeddingIsArray: Array.isArray(doc.embedding),
      embeddingLength: doc.embedding?.length || 0,
      embeddingFirstFew: Array.isArray(doc.embedding) ? doc.embedding.slice(0, 5) : 'Not an array'
    };

    return NextResponse.json({ analysis });

  } catch (error) {
    console.error('Test embedding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Test generating a new embedding
    const testText = "This is a test for embedding generation.";
    const embedding = await embeddingService.generateEmbedding(testText);
    
    return NextResponse.json({
      testText,
      embeddingGenerated: true,
      embeddingLength: embedding.length,
      embeddingFirstFew: embedding.slice(0, 5)
    });

  } catch (error) {
    return NextResponse.json({
      testText: "This is a test for embedding generation.",
      embeddingGenerated: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}