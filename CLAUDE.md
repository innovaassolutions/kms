# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
```bash
# Development
npm run dev              # Start dev server with Turbopack
npm run build           # Production build
npm run start           # Start production server
npm run lint            # ESLint checking
npm run lint:fix        # Auto-fix linting issues

# Background Processing
npx tsx scripts/process-documents.ts process_all
npx tsx scripts/process-documents.ts process_text
npx tsx scripts/process-documents.ts process_transcriptions
npx tsx scripts/process-documents.ts process_embeddings

# Auto-Processing (prevents documents from getting stuck)
node scripts/auto-process-daemon.js              # Run continuous auto-processing
curl http://localhost:3001/kms/api/background-process      # Check pending documents count
curl -X POST http://localhost:3001/kms/api/background-process  # Manually trigger processing

# PM2 Process Management
pm2 start ecosystem.config.js    # Start all KMS processes
pm2 stop kms-server              # Stop KMS server
pm2 stop kms-auto-process        # Stop auto-process daemon
pm2 restart kms-server           # Restart KMS server
pm2 logs kms-server              # View KMS server logs
pm2 logs kms-auto-process        # View auto-process logs
pm2 list                         # List all PM2 processes
pm2 save                         # Save current process list
```

### Development Server
- Development server runs on `http://localhost:3001` (port 3000 is used by the main webserver)
- Uses Turbopack for faster builds
- **BasePath**: `/kms` (all routes are prefixed with /kms)
- Upload interface: `/kms/upload`
- Processing status: `/kms/status`
- Search interface: `/kms/search`
- Chat interface: `/kms/chat`

## Architecture Overview

### Tech Stack
- **Next.js 15.3.3** with App Router
- **TypeScript** with strict mode
- **Chakra UI 2.10.1** for components and theming
- **Supabase** for database (PostgreSQL + pgvector) and storage
- **OpenAI API** for Whisper transcription and text-embedding-3-small
- **AssemblyAI** for large file transcription (optional fallback)

### Core Processing Pipeline
1. **File Upload** → Supabase Storage
2. **Text Extraction** → PDF/DOCX/TXT processing
3. **Transcription** → Multi-provider (OpenAI Whisper, AssemblyAI fallback)
4. **Embeddings** → Vector generation for semantic search
5. **Storage** → Database with processing status tracking

### Key Application Structure
```
src/
├── app/                          # Next.js App Router
│   ├── api/                      # API endpoints
│   │   ├── process-documents/    # Main processing endpoint
│   │   ├── search/               # Search functionality
│   │   ├── dashboard-stats/      # Analytics
│   │   ├── background-process/   # Background processing API
│   │   └── chat/                 # Chat interface API
│   ├── upload/                   # File upload interface
│   ├── status/                   # Processing dashboard
│   ├── search/                   # Search interface
│   ├── chat/                     # Chat interface
│   └── page.tsx                  # Home page
├── components/                   # UI components
│   ├── ClientLayout.tsx          # Main layout with sidebar/header
│   ├── ChakraProviders.tsx       # Theme providers
│   └── theme.ts                  # Chakra UI theme
├── utils/                        # Business logic
│   ├── documentProcessor.ts      # Text extraction (PDF, DOCX, TXT)
│   ├── transcriptionService.ts   # Multi-provider transcription (OpenAI + AssemblyAI)
│   ├── embeddingService.ts       # Vector embedding generation
│   ├── claudeService.ts          # Claude API integration
│   └── supabase/                 # Database clients
└── hooks/                        # Custom React hooks
```

## Environment Configuration

### Required Environment Variables
```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

# OpenAI
OPENAI_API_KEY=your_openai_api_key

# AssemblyAI (Optional - for large file transcription)
ASSEMBLYAI_API_KEY=your_assemblyai_api_key

# Background Processing
BACKGROUND_PROCESS_API_KEY=secure_random_string
API_URL=http://localhost:3001  # Base URL for daemon

# Claude API (for chat functionality)
CLAUDE_API_KEY=your_claude_api_key  # Optional
```

### File Support
- **Text Documents**: PDF, DOCX, TXT, MD (Markdown)
- **Audio Files**: MP3, WAV, M4A (up to 5GB with AssemblyAI fallback)
- **Video Files**: MP4, MOV (up to 5GB with AssemblyAI fallback)

## Database Schema

### Documents Table
```sql
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT CHECK (type IN ('strategy', 'meeting', 'email', 'sop', 'idea', 'audio', 'video', 'whitepaper', 'project-plan', 'project-charter', 'workshop', 'knowledge')),
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

## Development Workflow

### Process Step Completion Requirements
**IMPORTANT**: Do not proceed to the next development phase or process step until ALL current processes have been completed and confirmed, including:
- All code changes have been implemented and tested
- All database migrations have been executed successfully
- All external/manual processes (like SQL migrations in Supabase) have been confirmed complete
- All dependencies are properly installed and configured
- All tests pass and the system is functional

### File Processing States
- **Pending**: Newly uploaded, not yet processed
- **Processing**: Currently being processed
- **Completed**: Successfully processed
- **Error**: Processing failed

### Background Processing
- **Automatic**: Auto-processing daemon runs continuously
- **Manual**: Run processing scripts directly via npm commands
- **API**: HTTP endpoints for triggering processing remotely
- **Daemon**: `scripts/auto-process-daemon.js` handles stuck documents
- **Authentication**: Bearer token required for background API calls

## Code Patterns

### File Processing
- Text extraction uses `pdf-parse`, `mammoth` for DOCX
- Audio/video transcription via multi-provider service (OpenAI Whisper + AssemblyAI)
- Automatic fallback to AssemblyAI for files over 25MB
- Vector embeddings use OpenAI's text-embedding-3-small (1536 dimensions)
- Processing includes rate limiting and error handling

### Database Operations
- Use server-side Supabase client for sensitive operations
- Client-side operations for public data and file uploads
- Vector search implemented via custom RPC function `match_documents`

### UI Components
- Chakra UI with custom theme supporting dark mode
- Drag-and-drop file upload with `react-dropzone`
- Real-time status updates via database polling
- Chart.js for analytics and dashboard visualizations

## External Dependencies

### Supabase Setup Requirements
- PostgreSQL with pgvector extension enabled
- `documents` storage bucket with proper RLS policies
- Custom RPC function for vector similarity search

### Transcription Services Integration
- **OpenAI Whisper**: Primary transcription service (25MB limit)
- **AssemblyAI**: Fallback service for large files (5GB limit)
- Automatic provider selection based on file size
- **OpenAI Embeddings**: text-embedding-3-small for semantic search
- Rate limiting and error handling built into all services

## Testing and Debugging

### Common Debug Steps
1. Check browser console for client-side errors
2. Check terminal for server-side errors
3. Verify Supabase connection and permissions
4. Test OpenAI API connectivity and credits
5. Monitor processing status in database

### File Upload Testing
- Test various file types and sizes
- Verify metadata collection and categorization
- Check file storage in Supabase bucket
- Monitor processing pipeline completion

## Performance Considerations

### Processing Optimization
- Batch processing to avoid rate limits
- Built-in delays between API calls
- Error handling and retry logic
- Status tracking for monitoring

### Scaling Considerations
- Background processing designed for automation
- Multi-provider transcription handles files up to 5GB
- Vector search optimized for semantic similarity
- Intelligent file size routing and processing timeouts
- Resource monitoring for large files