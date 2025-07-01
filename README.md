# 🧠 Innovaas Knowledge Management System (KMS)

Welcome to the Innovaas KMS! This system allows you to upload, process, and search company documents and media files with the help of AI (OpenAI Whisper & Embeddings).

## 🚀 Features
- Upload PDF, DOCX, TXT, MP3, WAV, M4A, MP4, and MOV files
- Automatic text extraction and transcription (audio/video)
- AI-powered vector embeddings for semantic search
- Real-time document processing status dashboard
- Built with Next.js, Supabase, and Chakra UI

## 📋 Quick Start

1. **Clone the repository**
2. **Install dependencies**
   ```bash
   npm install
   ```
3. **Configure environment variables**
   - Copy `.env.local.example` to `.env.local` and fill in your Supabase and OpenAI keys
4. **Run the development server**
   ```bash
   npm run dev
   ```
5. **Access the app**
   - Upload documents at `/kms/upload`
   - Monitor processing at `/kms/status`

## 🛠️ Setup & Configuration
See [SETUP.md](./SETUP.md) for detailed setup instructions, including:
- Supabase database schema
- Storage bucket setup
- Required environment variables
- Enabling vector search (pgvector)

## 🗂️ Project Structure
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

## 🧪 Processing Pipeline
1. **Upload**: Files are uploaded to Supabase Storage
2. **Text Extraction**: PDF, DOCX, and TXT files have text extracted
3. **Transcription**: Audio and video files are transcribed using OpenAI Whisper
4. **Embedding**: All text content is converted to vector embeddings
5. **Status**: Monitor progress at `/kms/status`

## 🤝 Contributing
- Please read the code, test features, and suggest improvements!
- New developers: see [SETUP.md](./SETUP.md) for a step-by-step guide

## 📞 Support
If you have questions or need help, check the [SETUP.md](./SETUP.md) or reach out to the project maintainer.
