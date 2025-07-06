import { supabase } from './supabase/client';
import { AssemblyAI } from 'assemblyai';

type TranscriptionProvider = 'openai' | 'assemblyai';

// File size limits (in bytes)
const OPENAI_FILE_SIZE_LIMIT = 25 * 1024 * 1024; // 25MB
const ASSEMBLYAI_FILE_SIZE_LIMIT = 5 * 1024 * 1024 * 1024; // 5GB

// Transcription service supporting multiple providers
export class TranscriptionService {
  private openaiApiKey: string;
  private assemblyaiClient: AssemblyAI | null;

  constructor() {
    this.openaiApiKey = process.env.OPENAI_API_KEY || '';
    
    // Initialize AssemblyAI if API key is available
    const assemblyaiApiKey = process.env.ASSEMBLYAI_API_KEY;
    this.assemblyaiClient = assemblyaiApiKey ? new AssemblyAI({ apiKey: assemblyaiApiKey }) : null;
    
    // Log available services
    const availableServices = [];
    if (this.openaiApiKey) availableServices.push('OpenAI Whisper (≤25MB)');
    if (this.assemblyaiClient) availableServices.push('AssemblyAI (≤5GB)');
    
    if (availableServices.length === 0) {
      console.warn('⚠️  No transcription API keys found. Transcription will not work.');
    } else {
      console.log(`🎙️  Transcription services available: ${availableServices.join(', ')}`);
    }
  }

  // Determine best transcription provider based on file size
  private getTranscriptionProvider(fileSize: number): TranscriptionProvider {
    if (fileSize <= OPENAI_FILE_SIZE_LIMIT && this.openaiApiKey) {
      return 'openai';
    } else if (fileSize <= ASSEMBLYAI_FILE_SIZE_LIMIT && this.assemblyaiClient) {
      return 'assemblyai';
    } else if (this.openaiApiKey) {
      return 'openai'; // Will fail but we'll get proper error message
    } else if (this.assemblyaiClient) {
      return 'assemblyai';
    } else {
      throw new Error('No transcription providers configured');
    }
  }

  // Transcribe using OpenAI Whisper
  private async transcribeWithOpenAI(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
    if (!this.openaiApiKey) {
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
          'Authorization': `Bearer ${this.openaiApiKey}`,
        },
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`Transcription failed: ${response.status}: ${errorData.error?.message || response.statusText}`);
      }

      const transcription = await response.text();
      return transcription.trim();
    } catch (error) {
      console.error('OpenAI transcription error:', error);
      throw error;
    }
  }

  // Transcribe using AssemblyAI
  private async transcribeWithAssemblyAI(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
    if (!this.assemblyaiClient) {
      throw new Error('AssemblyAI not configured');
    }

    try {
      // Convert ArrayBuffer to Buffer for AssemblyAI
      const buffer = Buffer.from(fileBuffer);
      
      // Upload file to AssemblyAI
      const uploadUrl = await this.assemblyaiClient.files.upload(buffer);
      
      // Submit transcription job
      const transcript = await this.assemblyaiClient.transcripts.transcribe({
        audio_url: uploadUrl,
        speaker_labels: true, // Enable speaker diarization
        punctuate: true,      // Add punctuation
        format_text: true,    // Format the text
      });

      if (transcript.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
      }

      return transcript.text || '';
    } catch (error) {
      console.error('AssemblyAI transcription error:', error);
      throw error;
    }
  }

  // Main transcription method with provider selection
  async transcribeFile(fileBuffer: ArrayBuffer, fileName: string): Promise<string> {
    const fileSize = fileBuffer.byteLength;
    const provider = this.getTranscriptionProvider(fileSize);
    
    console.log(`Transcribing ${fileName} (${Math.round(fileSize / 1024 / 1024)}MB) using ${provider}`);
    
    try {
      if (provider === 'openai') {
        return await this.transcribeWithOpenAI(fileBuffer, fileName);
      } else {
        return await this.transcribeWithAssemblyAI(fileBuffer, fileName);
      }
    } catch (error) {
      // If OpenAI fails due to file size and AssemblyAI is available, try fallback
      if (provider === 'openai' && this.assemblyaiClient && error instanceof Error) {
        // Check for various file size error indicators
        const isFileSizeError = error.message.includes('Maximum content size limit') || 
                               error.message.includes('413') ||
                               error.message.includes('content size limit') ||
                               error.message.includes('file too large');
        
        if (isFileSizeError) {
          console.log(`OpenAI failed due to file size (${Math.round(fileSize / 1024 / 1024)}MB), falling back to AssemblyAI`);
          try {
            return await this.transcribeWithAssemblyAI(fileBuffer, fileName);
          } catch (assemblyError) {
            console.error('AssemblyAI fallback also failed:', assemblyError);
            throw new Error(`Both transcription services failed. OpenAI: ${error.message}. AssemblyAI: ${assemblyError instanceof Error ? assemblyError.message : 'Unknown error'}`);
          }
        }
      }
      
      // If no AssemblyAI available, provide helpful error message
      if (provider === 'openai' && !this.assemblyaiClient && error instanceof Error) {
        const isFileSizeError = error.message.includes('Maximum content size limit') || 
                               error.message.includes('413') ||
                               error.message.includes('content size limit');
        if (isFileSizeError) {
          throw new Error(`File too large for OpenAI Whisper (25MB limit). Configure ASSEMBLYAI_API_KEY for large file support. Original error: ${error.message}`);
        }
      }
      
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