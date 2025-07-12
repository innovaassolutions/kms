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

  // 4b. Get ALL documents for word cloud analysis (including title and content)
  const { data: allDocsData, error: allDocsError } = await supabaseServer
    .from('documents')
    .select('title, content_text, transcription, type');

  const processingStatus = {
    pending: 0,
    processed: 0,
    embedded: 0,
    error: 0
  };

  if (statusData) {
    for (const doc of statusData) {
      const hasContent = doc.content_text || doc.transcription;
      const hasEmbedding = doc.embedding && (
        (Array.isArray(doc.embedding) && doc.embedding.length > 0) ||
        (typeof doc.embedding === 'string' && doc.embedding.length > 0)
      );
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

  // 5. Generate word cloud data from ALL document content
  const generateWordCloud = (documents: any[]) => {
    const wordFreq: { [key: string]: { count: number; categories: Set<string> } } = {};
    const phraseFreq: { [key: string]: { count: number; categories: Set<string> } } = {};
    
    const stopWords = new Set([
      'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by',
      'from', 'up', 'about', 'into', 'through', 'during', 'before', 'after', 'above',
      'below', 'between', 'among', 'around', 'is', 'are', 'was', 'were', 'be', 'been',
      'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could',
      'should', 'may', 'might', 'must', 'shall', 'can', 'a', 'an', 'this', 'that',
      'these', 'those', 'i', 'you', 'he', 'she', 'it', 'we', 'they', 'me', 'him',
      'her', 'us', 'them', 'my', 'your', 'his', 'its', 'our', 'their', 'if', 'so',
      'what', 'when', 'where', 'who', 'why', 'how', 'all', 'any', 'both', 'each',
      'few', 'more', 'most', 'other', 'some', 'such', 'no', 'nor', 'not', 'only',
      'own', 'same', 'than', 'too', 'very', 'just', 'now', 'also', 'one', 'two',
      'first', 'second', 'new', 'old', 'good', 'bad', 'big', 'small', 'long', 'short'
    ]);

    // Common technical compound terms to look for
    const compoundTerms = [
      'unified namespace', 'data model', 'data structure', 'data flow', 'data source',
      'api gateway', 'cloud computing', 'edge computing', 'machine learning', 'artificial intelligence',
      'user interface', 'user experience', 'real time', 'real-time', 'proof of concept',
      'service oriented', 'event driven', 'message queue', 'load balancer', 'database schema',
      'project management', 'software development', 'system architecture', 'network topology',
      'security model', 'authentication system', 'authorization framework'
    ];

    documents.forEach((doc: any) => {
      // Combine title and content for analysis
      const fullText = `${doc.title || ''} ${doc.content_text || ''} ${doc.transcription || ''}`;
      const content = fullText.toLowerCase();
      
      if (!content.trim()) return; // Skip empty documents
      
      // First, look for compound terms
      compoundTerms.forEach(term => {
        const regex = new RegExp(term.replace(/[-\s]/g, '[-\\s]+'), 'gi');
        const matches = content.match(regex);
        if (matches) {
          const normalizedTerm = term.replace(/[-\s]/g, ' ');
          if (!phraseFreq[normalizedTerm]) {
            phraseFreq[normalizedTerm] = { count: 0, categories: new Set() };
          }
          phraseFreq[normalizedTerm].count += matches.length;
          if (doc.type) {
            phraseFreq[normalizedTerm].categories.add(doc.type);
          }
        }
      });
      
      // Then process individual words
      const words = content
        .replace(/[^a-zA-Z\s]/g, ' ')
        .split(/\s+/)
        .filter((word: string) => word.length > 3 && !stopWords.has(word));
      
      words.forEach((word: string) => {
        if (!wordFreq[word]) {
          wordFreq[word] = { count: 0, categories: new Set() };
        }
        wordFreq[word].count++;
        if (doc.type) {
          wordFreq[word].categories.add(doc.type);
        }
      });
    });

    // Combine phrases and words, prioritizing phrases
    const allTerms = {
      ...Object.fromEntries(
        Object.entries(phraseFreq).map(([term, data]) => [
          term,
          { ...data, count: data.count * 2 } // Give phrases higher weight
        ])
      ),
      ...wordFreq
    };

    // Get top 25 terms
    return Object.entries(allTerms)
      .sort(([,a], [,b]) => b.count - a.count)
      .slice(0, 25)
      .map(([word, data]) => ({
        word,
        count: data.count,
        category: Array.from(data.categories)[0] || 'unknown'
      }));
  };

  const wordCloud = allDocsData ? generateWordCloud(allDocsData) : [];

  return NextResponse.json({
    totalDocuments: totalDocuments ?? 0,
    typeCounts,
    totalSize,
    processingStatus,
    wordCloud,
    errors: {
      countError,
      typeError,
      sizeError,
      statusError,
      allDocsError,
    },
  });
} 