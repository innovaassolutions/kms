import { NextResponse } from 'next/server';
import supabaseServer from '@/utils/supabase/serverClients';

export async function GET() {
  // 1. Total document count
  const { count: totalDocuments, error: countError } = await supabaseServer
    .from('documents')
    .select('id', { count: 'exact', head: true });

  // 2. File type distribution based on file extensions
  const { data: fileData, error: typeError } = await supabaseServer
    .from('documents')
    .select('file_path, title');

  // 3. Total file size (if file_size column exists)
  let totalSize = 0;
  let sizeError = null;
  const { data: sizeData, error: sizeDataError } = await supabaseServer
    .from('documents')
    .select('file_size');
  if (sizeDataError) {
    sizeError = sizeDataError;
  } else if (sizeData && sizeData.length > 0) {
    totalSize = sizeData.reduce((sum, doc) => sum + (doc.file_size || 0), 0);
  }

  // 4. Processing status counts
  const { data: statusData, error: statusError } = await supabaseServer
    .from('documents')
    .select('content_text, transcription, embedding, transcription_status');

  const processingStatus = {
    pending: 0,
    processed: 0,
    embedded: 0,
    error: 0
  };

  if (statusData) {
    for (const doc of statusData) {
      const hasContent = doc.content_text || doc.transcription;
      const hasEmbedding = doc.embedding && Array.isArray(doc.embedding) && doc.embedding.length > 0;
      const isError = doc.transcription_status === 'error';

      if (isError) {
        processingStatus.error++;
      } else if (hasEmbedding) {
        processingStatus.embedded++;
      } else if (hasContent) {
        processingStatus.processed++;
      } else {
        processingStatus.pending++;
      }
    }
  }

  // Helper function to extract file extension
  const getFileExtension = (filePath: string, title: string): string => {
    // Try to get extension from file_path first
    if (filePath) {
      const ext = filePath.split('.').pop()?.toLowerCase();
      if (ext) return `.${ext}`;
    }
    // Fallback to title
    if (title) {
      const ext = title.split('.').pop()?.toLowerCase();
      if (ext && ext !== title.toLowerCase()) return `.${ext}`;
    }
    return '.unknown';
  };

  // Pie chart data: count by file extension
  const typeCounts: Record<string, number> = {};
  if (fileData) {
    for (const doc of fileData) {
      const extension = getFileExtension(doc.file_path || '', doc.title || '');
      typeCounts[extension] = (typeCounts[extension] || 0) + 1;
    }
  }

  return NextResponse.json({
    totalDocuments: totalDocuments ?? 0,
    typeCounts,
    totalSize,
    processingStatus,
    errors: {
      countError,
      typeError,
      sizeError,
      statusError,
    },
  });
} 