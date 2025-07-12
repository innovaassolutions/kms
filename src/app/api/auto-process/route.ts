import { NextResponse } from 'next/server';
import { supabaseServer } from '@/utils/supabase/serverClients';

export async function POST() {
  try {
    // Find all documents that need processing
    const { data: pendingDocs, error } = await supabaseServer
      .from('documents')
      .select('id, title, media_type')
      .or('content_text.is.null,transcription.is.null,embedding.is.null')
      .neq('transcription_status', 'error')
      .limit(10); // Process up to 10 at a time

    if (error) {
      throw error;
    }

    if (!pendingDocs || pendingDocs.length === 0) {
      return NextResponse.json({ 
        message: 'No documents pending processing',
        processed: 0 
      });
    }

    const results = [];
    
    for (const doc of pendingDocs) {
      try {
        // Process each document
        const processResponse = await fetch(`${process.env.API_URL || 'http://localhost:3001'}/api/process-documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            documentId: doc.id,
            action: 'process_all'
          }),
        });

        if (processResponse.ok) {
          results.push({ id: doc.id, title: doc.title, status: 'success' });
        } else {
          const errorText = await processResponse.text();
          results.push({ id: doc.id, title: doc.title, status: 'failed', error: errorText });
        }
      } catch (error) {
        results.push({ 
          id: doc.id, 
          title: doc.title, 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Unknown error' 
        });
      }

      // Add small delay between processing to avoid overwhelming APIs
      await new Promise(resolve => setTimeout(resolve, 1000));
    }

    return NextResponse.json({
      message: `Processed ${results.length} documents`,
      results,
      processed: results.filter(r => r.status === 'success').length,
      failed: results.filter(r => r.status === 'failed').length
    });

  } catch (error) {
    console.error('Auto-processing error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}

// GET endpoint to check pending documents count
export async function GET() {
  try {
    const { count, error } = await supabaseServer
      .from('documents')
      .select('id', { count: 'exact', head: true })
      .or('content_text.is.null,transcription.is.null,embedding.is.null')
      .neq('transcription_status', 'error');

    if (error) {
      throw error;
    }

    return NextResponse.json({
      pendingCount: count || 0,
      message: `${count || 0} documents pending processing`
    });

  } catch (error) {
    console.error('Error checking pending documents:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error occurred' },
      { status: 500 }
    );
  }
}