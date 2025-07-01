import { supabase } from './supabase/client';

// Transcription service using OpenAI Whisper API
export class TranscriptionService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || '';
    if (!this.apiKey) {
      console.warn('OpenAI API key not found. Transcription will not work.');
    }
  }

  // Transcribe audio/video file using OpenAI Whisper
  async transcribeFile(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
    if (!this.apiKey) {
      throw new Error('OpenAI API key not configured');
    }

    try {
      // Convert ArrayBuffer to FormData for OpenAI API
      const formData = new FormData();
      const blob = new Blob([fileBuffer]);
      formData.append('file', blob, fileName);
      formData.append('model', 'whisper-1');
      formData.append('response_format', 'text');

      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Transcription failed: ${errorData.error?.message || response.statusText}`);
      }

      const transcription = await response.text();
      return transcription.trim();
    } catch (error) {
      console.error('Transcription error:', error);
      throw new Error(`Failed to transcribe file: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // Process audio/video documents for transcription
  async processAudioVideoDocument(documentId: string): Promise<void> {
    try {
      // 1. Get document metadata
      const { data: document, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('id', documentId)
        .single();

      if (fetchError || !document) {
        throw new Error('Document not found');
      }

      // 2. Check if it's an audio/video file
      if (document.media_type !== 'audio' && document.media_type !== 'video') {
        throw new Error('Document is not an audio or video file');
      }

      // 3. Download file from storage
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(document.file_path);

      if (downloadError || !fileData) {
        throw new Error('Failed to download file');
      }

      // 4. Transcribe the file
      const fileBuffer = await fileData.arrayBuffer();
      const transcription = await this.transcribeFile(fileBuffer, document.file_path);

      // 5. Update document with transcription
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          transcription: transcription,
          transcription_status: 'completed',
          content_text: transcription // Use transcription as content for audio/video
        })
        .eq('id', documentId);

      if (updateError) {
        throw updateError;
      }

      console.log(`Successfully transcribed ${document.media_type} document: ${document.title}`);
    } catch (error) {
      console.error('Error processing audio/video document:', error);
      
      // Update document status to error
      await supabase
        .from('documents')
        .update({ transcription_status: 'error' })
        .eq('id', documentId);
      
      throw error;
    }
  }

  // Get all audio/video documents that need transcription
  async getAudioVideoDocumentsForTranscription(): Promise<any[]> {
    const { data, error } = await supabase
      .from('documents')
      .select('*')
      .or('media_type.eq.audio,media_type.eq.video')
      .eq('transcription_status', 'pending')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching audio/video documents:', error);
      return [];
    }

    return data || [];
  }

  // Process all pending audio/video documents
  async processAllPendingAudioVideoDocuments(): Promise<void> {
    const documents = await this.getAudioVideoDocumentsForTranscription();
    
    for (const document of documents) {
      try {
        await this.processAudioVideoDocument(document.id);
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 2000));
      } catch (error) {
        console.error(`Failed to transcribe document ${document.id}:`, error);
      }
    }
  }
}

// Export singleton instance
export const transcriptionService = new TranscriptionService(); 