#!/usr/bin/env node

// Proper video transcription processing script
const { createClient } = require('@supabase/supabase-js');
const { AssemblyAI } = require('assemblyai');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

class VideoTranscriber {
  constructor() {
    this.assemblyai = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY
    });
    console.log('🎙️  Using AssemblyAI for video transcription (supports MOV files up to 5GB)');
  }

  async transcribeWithAssemblyAI(fileBuffer, fileName) {
    try {
      console.log('   📤 Uploading to AssemblyAI...');
      
      // Upload file to AssemblyAI
      const uploadUrl = await this.assemblyai.files.upload(Buffer.from(fileBuffer));
      console.log('   ✅ File uploaded, starting transcription...');
      
      // Submit transcription job with enhanced settings
      const transcript = await this.assemblyai.transcripts.transcribe({
        audio_url: uploadUrl,
        speaker_labels: true,    // Enable speaker diarization
        punctuate: true,         // Add punctuation
        format_text: true,       // Format the text
        word_boost: ['MES', 'OEE', 'UNS', 'MQTT', 'Sparkplug', 'IoT', 'SCADA', 'HMI'], // Boost technical terms
        boost_param: 'high'      // High boost for technical terms
      });

      if (transcript.status === 'error') {
        throw new Error(`AssemblyAI transcription failed: ${transcript.error}`);
      }

      console.log(`   ✅ Transcription completed by AssemblyAI`);
      return transcript.text || '';
    } catch (error) {
      console.error('   ❌ AssemblyAI transcription error:', error);
      throw error;
    }
  }

  async processVideoDocument(document) {
    const { id, title, file_path } = document;
    
    console.log(`🎬 Processing: ${title}`);
    console.log(`   📁 File: ${file_path}`);
    
    try {
      // Update status to processing
      await supabase
        .from('documents')
        .update({ transcription_status: 'processing' })
        .eq('id', id);
      
      // Download file from storage
      console.log('   📥 Downloading file...');
      const { data: fileData, error: downloadError } = await supabase.storage
        .from('documents')
        .download(file_path);

      if (downloadError || !fileData) {
        throw new Error(`Download failed: ${downloadError?.message || 'No file data'}`);
      }

      // Get file size for provider selection
      const fileBuffer = await fileData.arrayBuffer();
      const fileSizeMB = Math.round(fileBuffer.byteLength / (1024 * 1024));
      
      console.log(`   📊 File size: ${fileSizeMB}MB`);
      
      // Step 1: Transcribe the audio
      console.log('   🎙️  Starting audio transcription...');
      const transcription = await this.transcribeWithAssemblyAI(fileBuffer, file_path);
      
      if (!transcription || transcription.trim().length === 0) {
        console.log('   ⚠️  Transcription returned empty result, but continuing with frame processing...');
      }
      
      console.log(`   ✅ Audio transcription completed (${transcription?.length || 0} characters)`);
      
      // Step 2: Process video frames and OCR
      console.log('   🖼️  Starting frame extraction and OCR...');
      const frameProcessingResult = await this.processVideoFrames(id, fileBuffer, file_path);
      
      // Combine transcription with OCR text for searchable content
      const combinedContent = [
        transcription,
        frameProcessingResult.ocrText
      ].filter(Boolean).join('\n\n--- Frame OCR Content ---\n\n');
      
      // Update document with all results
      const { error: updateError } = await supabase
        .from('documents')
        .update({ 
          transcription: transcription || '',
          transcription_status: 'completed',
          content_text: combinedContent || transcription || 'No content extracted'
        })
        .eq('id', id);

      if (updateError) {
        throw updateError;
      }

      console.log(`   🎉 Successfully processed: ${title}`);
      console.log(`   📊 Results: ${frameProcessingResult.framesCount} frames, ${transcription?.length || 0} transcription chars, ${frameProcessingResult.ocrText?.length || 0} OCR chars`);
      
      return { 
        success: true, 
        length: combinedContent?.length || 0,
        frames: frameProcessingResult.framesCount,
        transcriptionLength: transcription?.length || 0,
        ocrLength: frameProcessingResult.ocrText?.length || 0
      };
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
      
      // Update status to error
      await supabase
        .from('documents')
        .update({ transcription_status: 'error' })
        .eq('id', id);
      
      return { success: false, error: error.message };
    }
  }

  async processVideoFrames(documentId, fileBuffer, filePath) {
    try {
      // Call the video processing API endpoint
      const apiUrl = process.env.API_URL || 'http://localhost:3001';
      const response = await fetch(`${apiUrl}/kms/api/process-video`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          documentId: documentId,
          options: {
            maxFrames: 50, // Limit frames for performance
            intervalSeconds: 30,
            enableSmartSampling: true,
            quality: 75
          },
          enableVisionAnalysis: true,
          enableEmbeddings: false, // Skip embeddings for now to speed up processing
          processingMode: 'complete'
        })
      });

      if (!response.ok) {
        console.log(`   ⚠️  Frame processing API failed (${response.status}), skipping frame extraction`);
        return { framesCount: 0, ocrText: '' };
      }

      const result = await response.json();
      
      if (result.success) {
        // Extract OCR text from the processed frames
        const { data: frames } = await supabase
          .from('video_frames')
          .select('ocr_text')
          .eq('document_id', documentId)
          .not('ocr_text', 'is', null);

        const ocrText = frames
          ?.map(frame => frame.ocr_text)
          .filter(Boolean)
          .join('\n') || '';

        return {
          framesCount: result.data?.frames?.length || 0,
          ocrText: ocrText
        };
      } else {
        console.log(`   ⚠️  Frame processing failed: ${result.message || 'Unknown error'}`);
        return { framesCount: 0, ocrText: '' };
      }
    } catch (error) {
      console.log(`   ⚠️  Frame processing error: ${error.message}, continuing without frames`);
      return { framesCount: 0, ocrText: '' };
    }
  }

  async processAllPendingVideos() {
    console.log('🚀 Starting video transcription processing...');
    
    try {
      // Get all pending video documents
      const { data: pendingVideos, error: fetchError } = await supabase
        .from('documents')
        .select('*')
        .eq('media_type', 'video')
        .eq('transcription_status', 'pending')
        .order('created_at', { ascending: true })
        .limit(10); // Process in batches of 10
      
      if (fetchError) {
        console.error('❌ Error fetching pending videos:', fetchError);
        return;
      }
      
      if (!pendingVideos || pendingVideos.length === 0) {
        console.log('✅ No pending videos found for transcription');
        return;
      }
      
      console.log(`📊 Found ${pendingVideos.length} pending videos to process`);
      console.log('');
      
      let processed = 0;
      let succeeded = 0;
      let failed = 0;
      let totalChars = 0;
      let totalFrames = 0;
      let totalOcrChars = 0;
      let emptyResults = [];
      
      for (const video of pendingVideos) {
        processed++;
        console.log(`📹 Processing video ${processed}/${pendingVideos.length}`);
        
        const result = await this.processVideoDocument(video);
        
        if (result.success) {
          succeeded++;
          totalChars += result.length || 0;
          totalFrames += result.frames || 0;
          totalOcrChars += result.ocrLength || 0;
        } else {
          failed++;
          if (result.error && result.error.includes('empty result')) {
            emptyResults.push({
              title: video.title,
              file_path: video.file_path,
              id: video.id
            });
          }
        }
        
        // Add delay to avoid rate limiting
        if (processed < pendingVideos.length) {
          console.log('   ⏱️  Waiting 3 seconds to avoid rate limits...');
          await new Promise(resolve => setTimeout(resolve, 3000));
        }
        
        console.log('');
      }
      
      console.log('🎉 Batch processing completed!');
      console.log(`📊 Results:`);
      console.log(`   ✅ Succeeded: ${succeeded} videos`);
      console.log(`   ❌ Failed: ${failed} videos`);
      console.log(`   📝 Total content: ${totalChars.toLocaleString()} characters`);
      console.log(`   🖼️  Total frames extracted: ${totalFrames.toLocaleString()}`);
      console.log(`   📋 Total OCR text: ${totalOcrChars.toLocaleString()} characters`);
      
      // Report videos with empty results
      if (emptyResults.length > 0) {
        console.log(`\n🔍 Videos that returned empty transcription results (${emptyResults.length}):`);
        emptyResults.forEach((video, index) => {
          console.log(`   ${index + 1}. ${video.title}`);
          console.log(`      File: ${video.file_path}`);
          console.log(`      ID: ${video.id}`);
        });
      }
      
      // Check remaining pending videos
      const { count: remainingCount } = await supabase
        .from('documents')
        .select('*', { count: 'exact', head: true })
        .eq('media_type', 'video')
        .eq('transcription_status', 'pending');
      
      if (remainingCount > 0) {
        console.log(`\\n⏳ ${remainingCount} videos still pending - run this script again to continue`);
      } else {
        console.log('\\n🎯 All videos have been processed!');
      }
      
    } catch (error) {
      console.error('❌ Fatal error:', error);
    }
  }
}

// Run the transcriber
const transcriber = new VideoTranscriber();
transcriber.processAllPendingVideos();