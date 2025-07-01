# 🚀 KMS Setup Guide

This guide will help you set up the Knowledge Management System (KMS) with all the necessary configurations.

## 📋 Prerequisites

1. **Node.js** (version 18 or higher)
2. **Supabase Project** with the following setup:
   - `documents` table with the schema from the build plan
   - `documents` storage bucket with proper RLS policies
3. **OpenAI API Key** for transcription and embeddings

## 🔧 Environment Configuration

Create a `.env.local` file in your project root with the following variables:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI Configuration (for transcription and embeddings)
OPENAI_API_KEY=your_openai_api_key
```

## 📦 Dependencies

The following packages are required for document processing:

```bash
npm install pdf-parse docx openai
```

## 🗄️ Database Schema

Make sure your Supabase `documents` table has the following schema:

```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('strategy', 'meeting', 'email', 'sop', 'idea', 'audio', 'video')),
  tags TEXT[],
  file_path TEXT,
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  content_text TEXT,
  media_type TEXT CHECK (media_type IN ('text', 'audio', 'video')),
  transcription TEXT,
  transcription_status TEXT CHECK (transcription_status IN ('pending', 'completed', 'error')),
  embedding VECTOR(1536) -- For OpenAI text-embedding-3-small
);
```

## 🔐 Storage Bucket Setup

1. Create a `documents` storage bucket in Supabase
2. Set up Row Level Security (RLS) policies
3. Configure CORS if needed for file uploads

## 🚀 Running the Application

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. Access the application at `http://localhost:3000`

## 📁 File Structure

```
src/
├── app/
│   ├── kms/
│   │   ├── page.tsx              # KMS home page
│   │   ├── upload/
│   │   │   └── page.tsx          # Document upload interface
│   │   └── status/
│   │       └── page.tsx          # Document processing status
│   └── api/
│       └── process-documents/
│           └── route.ts          # Document processing API
├── utils/
│   ├── documentProcessor.ts      # Text extraction utilities
│   ├── transcriptionService.ts   # Audio/video transcription
│   ├── embeddingService.ts       # Vector embedding generation
│   └── supabase/
│       ├── client.ts             # Supabase client
│       └── serverClients.ts      # Server-side Supabase client
└── components/                   # Reusable UI components
```

## 🔄 Processing Pipeline

1. **Upload**: Files are uploaded to Supabase Storage
2. **Text Extraction**: PDF, DOCX, and TXT files have text extracted
3. **Transcription**: Audio and video files are transcribed using OpenAI Whisper
4. **Embedding**: All text content is converted to vector embeddings
5. **Search**: Documents can be searched using vector similarity

## 🎯 Next Steps

After setup, you can:

1. Upload documents at `/kms/upload`
2. Monitor processing status at `/kms/status`
3. Implement search functionality (Phase 3)
4. Add LLM chat interface (Phase 4)

## 🐛 Troubleshooting

### Common Issues:

1. **Environment Variables**: Make sure all required environment variables are set
2. **Supabase Permissions**: Check RLS policies and API keys
3. **OpenAI API**: Verify your API key has sufficient credits
4. **File Upload**: Ensure storage bucket permissions are correct

### Debug Mode:

Enable debug logging by adding to your `.env.local`:
```bash
DEBUG=true
```

## 📞 Support

If you encounter issues, check:
1. Browser console for client-side errors
2. Terminal for server-side errors
3. Supabase dashboard for database/storage issues
4. OpenAI dashboard for API usage and errors 