import { supabase } from './supabase/client';
import { supabaseServer } from './supabase/serverClients';

// Types for document processing
export interface ProcessedDocument {
  id: string;
  title: string;
  content_text: string;
  media_type: 'text' | 'audio' | 'video';
  transcription_status: 'pending' | 'completed' | 'error' | null;
  transcription?: string;
}

// Text extraction functions
export async function extractTextFromPDF(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    // Use require instead of dynamic import to avoid bundling issues
    const pdf = require('pdf-parse');
    
    // Convert ArrayBuffer to Buffer for pdf-parse
    const buffer = Buffer.from(fileBuffer);
    
    // Use pdf-parse library for proper PDF text extraction
    const data = await pdf(buffer);
    
    // Extract text content
    const text = data.text;
    
    // Clean up the text (remove excessive whitespace, normalize)
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

export async function extractTextFromDOCX(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    // Dynamic import to avoid bundling issues
    const mammoth = (await import('mammoth')).default;
    
    // Convert ArrayBuffer to Buffer for mammoth
    const buffer = Buffer.from(fileBuffer);
    
    // Use mammoth to extract text from DOCX
    const result = await mammoth.extractRawText({ buffer });
    
    // Get the extracted text
    const text = result.value;
    
    // Clean up the text
    return text
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .replace(/\n\s*\n/g, '\n') // Replace multiple newlines with single newline
      .trim();
  } catch (error) {
    console.error('Error extracting text from DOCX:', error);
    throw new Error('Failed to extract text from DOCX');
  }
}

export async function extractTextFromTXT(fileBuffer: ArrayBuffer): Promise<string> {
  try {
    const textDecoder = new TextDecoder('utf-8');
    return textDecoder.decode(fileBuffer).trim();
  } catch (error) {
    console.error('Error extracting text from TXT:', error);
    throw new Error('Failed to extract text from TXT');
  }
}

// Main document processing function
export async function processDocument(documentId: string): Promise<void> {
  try {
    // 1. Get document metadata from database
    const { data: document, error: fetchError } = await supabaseServer
      .from('documents')
      .select('*')
      .eq('id', documentId)
      .single();

    if (fetchError || !document) {
      throw new Error('Document not found');
    }

    // 2. Download file from storage
    const { data: fileData, error: downloadError } = await supabaseServer.storage
      .from('documents')
      .download(document.file_path);

    if (downloadError || !fileData) {
      throw new Error('Failed to download file');
    }

    // 3. Extract text based on file type
    let contentText = '';
    const fileExtension = document.file_path.split('.').pop()?.toLowerCase();

    if (document.media_type === 'text') {
      const fileBuffer = await fileData.arrayBuffer();
      
      switch (fileExtension) {
        case 'pdf':
          contentText = await extractTextFromPDF(fileBuffer);
          break;
        case 'docx':
          contentText = await extractTextFromDOCX(fileBuffer);
          break;
        case 'txt':
        case 'md':
          contentText = await extractTextFromTXT(fileBuffer);
          break;
        default:
          throw new Error(`Unsupported text file type: ${fileExtension}`);
      }

      // 4. Update document with extracted text
      const { error: updateError } = await supabaseServer
        .from('documents')
        .update({ 
          content_text: contentText,
          transcription_status: 'completed' // Text files don't need transcription
        })
        .eq('id', documentId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Successfully processed text document: ${document.title}`);
    } else if (document.media_type === 'audio' || document.media_type === 'video') {
      // For audio/video files, we'll handle transcription separately
      // For now, just mark them as ready for transcription
      console.log(`Audio/Video document ready for transcription: ${document.title}`);
    }

  } catch (error) {
    console.error('Error processing document:', error);
    
    // Update document status to error
    await supabaseServer
      .from('documents')
      .update({ transcription_status: 'error' })
      .eq('id', documentId);
    
    throw error;
  }
}

// Function to get documents that need processing
export async function getDocumentsForProcessing(): Promise<ProcessedDocument[]> {
  const { data, error } = await supabase
    .from('documents')
    .select('*')
    .or('transcription_status.is.null,transcription_status.eq.pending')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching documents for processing:', error);
    return [];
  }

  return data || [];
}

// Function to process all pending documents
export async function processAllPendingDocuments(): Promise<void> {
  const documents = await getDocumentsForProcessing();
  
  for (const document of documents) {
    try {
      await processDocument(document.id);
      // Add a small delay to avoid overwhelming the system
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Failed to process document ${document.id}:`, error);
    }
  }
} 