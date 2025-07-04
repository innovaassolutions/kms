import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';

export async function GET() {
  try {
    // Get all documents with their processing status
    const { data: documents, error } = await supabaseServer
      .from('documents')
      .select('id, title, type, media_type, tags, created_at, content_text, transcription, embedding')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const analysis = documents?.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      type: doc.type,
      media_type: doc.media_type,
      tags: doc.tags || [],
      hasContent: !!(doc.content_text || doc.transcription),
      contentLength: (doc.content_text || doc.transcription || '').length,
      hasEmbedding: !!(doc.embedding && Array.isArray(doc.embedding)),
      embeddingLength: doc.embedding?.length || 0,
      contentPreview: (doc.content_text || doc.transcription || '').substring(0, 100) + '...',
      created_at: doc.created_at
    })) || [];

    const summary = {
      totalDocuments: analysis.length,
      withContent: analysis.filter(d => d.hasContent).length,
      withEmbeddings: analysis.filter(d => d.hasEmbedding).length,
      byType: analysis.reduce((acc, doc) => {
        acc[doc.type] = (acc[doc.type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      byMediaType: analysis.reduce((acc, doc) => {
        acc[doc.media_type] = (acc[doc.media_type] || 0) + 1;
        return acc;
      }, {} as Record<string, number>)
    };

    return NextResponse.json({
      summary,
      documents: analysis
    });

  } catch (error) {
    console.error('Error in debug endpoint:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}