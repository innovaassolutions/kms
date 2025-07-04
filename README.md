# 🧠 Innovaas Knowledge Management System (KMS)

Welcome to the Innovaas KMS! This comprehensive system allows you to upload, process, search, and chat with your company documents and media files using advanced AI capabilities.

## 🚀 Key Features

### 📁 Document Management
- **Upload**: PDF, DOCX, TXT, MD, MP3, WAV, M4A, MP4, and MOV files
- **Smart Tagging**: Select from existing tags or create new ones during upload
- **Document Types**: Strategy, Meeting, Email, SOP, Idea, Audio, Video, Whitepaper, Project Plan, Project Charter
- **Edit & Delete**: Full document management with metadata editing

### 🔍 Advanced Search
- **Semantic Search**: AI-powered vector similarity search using OpenAI embeddings
- **Smart Filtering**: Filter by document type, media type, and tags
- **Real-time Results**: Fast search with similarity scoring and content previews

### 💬 AI Chat Assistant
- **Document Chat**: Ask questions about your documents and get AI-powered answers
- **Contextual Filtering**: Focus conversations by selecting specific tags and document types
- **Source Citations**: See which documents were used to generate responses
- **Smart Context**: AI analyzes your documents to provide intelligent insights

### 📊 Analytics Dashboard
- **Processing Status**: Real-time monitoring of document processing pipeline
- **File Type Distribution**: Visual breakdown of your document collection
- **Storage Analytics**: Track total documents and storage usage
- **Auto-refresh**: Live updates every 5 seconds

### 🤖 Automated Processing
- **Text Extraction**: Automatic extraction from PDF, DOCX, TXT, and MD files
- **Audio/Video Transcription**: OpenAI Whisper integration for media files
- **Vector Embeddings**: Semantic search capabilities with text-embedding-3-small
- **Background Processing**: Automated pipeline with API endpoints and monitoring

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
   - **Dashboard**: Home page with analytics and status overview
   - **Upload**: `/kms/upload` - Upload and categorize documents
   - **Search**: `/kms/search` - Semantic search with filtering
   - **Chat**: `/kms/chat` - AI assistant for document questions
   - **Status**: `/kms/status` - Monitor processing pipeline

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
│   ├── page.tsx                  # Dashboard with analytics
│   ├── kms/
│   │   ├── upload/page.tsx       # Document upload with smart tagging
│   │   ├── search/page.tsx       # Semantic search with management
│   │   ├── chat/page.tsx         # AI chat assistant
│   │   └── status/page.tsx       # Processing status monitor
│   └── api/
│       ├── chat/route.ts         # AI chat API with context filtering
│       ├── search/route.ts       # Vector similarity search
│       ├── documents/[id]/       # Document CRUD operations
│       ├── dashboard-stats/      # Analytics data
│       ├── process-documents/    # Document processing pipeline
│       └── background-process/   # Automated processing
├── utils/
│   ├── documentProcessor.ts      # Text extraction (PDF, DOCX, TXT, MD)
│   ├── transcriptionService.ts   # OpenAI Whisper integration
│   ├── embeddingService.ts       # Vector embedding generation
│   └── supabase/
│       ├── client.ts             # Client-side Supabase
│       └── serverClients.ts      # Server-side Supabase
├── components/
│   ├── ClientLayout.tsx          # Main layout with sidebar
│   ├── ChakraProviders.tsx       # Theme and UI providers
│   └── theme.ts                  # Dark/light mode theming
└── scripts/
    └── process-documents.js      # Background processing scripts
```

## 🧪 Processing Pipeline
1. **Upload**: Files uploaded to Supabase Storage with metadata
2. **Text Extraction**: PDF, DOCX, TXT, and MD files processed automatically
3. **Transcription**: Audio/video files transcribed via OpenAI Whisper API
4. **Vector Embeddings**: Text converted to 1536-dimension vectors for semantic search
5. **Quality Assurance**: Processing status tracked and errors handled gracefully
6. **Real-time Updates**: Monitor progress via dashboard and status page

### Background Processing Commands
```bash
# Process all pending documents
npx tsx scripts/process-documents.ts process_all

# Process specific types
npx tsx scripts/process-documents.ts process_text
npx tsx scripts/process-documents.ts process_transcriptions
npx tsx scripts/process-documents.ts process_embeddings

# API endpoints for automation
curl -X POST http://localhost:3001/api/background-process \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"action":"process_all"}'
```

## 💡 Usage Examples

### Chat Assistant
Ask questions about your documents:
- "Summarize the key decisions from the latest meeting"
- "What are our strategic priorities for 2024?"
- "Show me all SOPs related to customer onboarding"

### Filtering & Search
- Use tag filtering to focus on specific topics or companies
- Select document types to narrow down results
- Combine filters for precise document discovery

### Document Management
- Edit document metadata including titles, types, and tags
- Delete outdated or incorrect documents
- Monitor processing status for new uploads

## 🔧 Technical Stack
- **Frontend**: Next.js 15.3.3, React, TypeScript, Chakra UI
- **Backend**: Next.js API Routes, Supabase PostgreSQL + pgvector
- **AI**: OpenAI GPT-4o-mini, Whisper, text-embedding-3-small
- **Storage**: Supabase Storage for file management
- **Processing**: Background workers for document pipeline

## 🤝 Contributing
- Please read the code, test features, and suggest improvements!
- New developers: see [SETUP.md](./SETUP.md) for a step-by-step guide
- Report issues or feature requests via GitHub Issues

## 📞 Support
If you have questions or need help, check the [SETUP.md](./SETUP.md) or reach out to the project maintainer.
