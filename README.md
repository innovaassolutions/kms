# 🧠 Innovaas Enhanced RAG Knowledge Management System (KMS)

Welcome to the next-generation Innovaas KMS! This comprehensive **Retrieval-Augmented Generation (RAG)** platform combines intelligent document processing, multi-modal AI analysis, and advanced vector search capabilities to create a powerful knowledge management solution for your organization.

## 🆕 **Major Version 2.0 Release - Enhanced RAG Platform**

This release transforms the KMS from a simple document manager into a sophisticated RAG-powered knowledge platform with two major enhancement phases:

### **Phase 1: Enhanced Foundation**
- ✅ **Advanced pgvector capabilities** with optimized similarity search
- ✅ **Intelligent document chunking** for better context preservation
- ✅ **Enhanced RAG pipeline** with multiple search strategies
- ✅ **Smart middleware architecture** for query routing and analysis
- ✅ **Comprehensive monitoring** and performance tracking

### **Phase 2: Multi-Modal Processing**
- ✅ **Video frame extraction** with intelligent scene detection
- ✅ **Claude Vision API integration** for technical content analysis
- ✅ **Multi-modal embeddings** combining text and visual content
- ✅ **Advanced database schema** for video frames and visual search

## 🚀 Key Features

### 📁 Enhanced Document Management
- **Multi-Format Upload**: PDF, DOCX, TXT, MD, MP3, WAV, M4A, MP4, and MOV files
- **Smart Tagging**: Select from existing tags or create new ones during upload
- **Document Types**: Strategy, Meeting, Email, SOP, Idea, Audio, Video, Whitepaper, Project Plan, Project Charter, Workshop, Knowledge
- **Edit & Delete**: Full document management with metadata editing
- **Large File Support**: Audio/video files up to 5GB with AssemblyAI fallback
- **🆕 Optimized Upload Performance**: Chunked uploads for files >50MB with 3-5x speed improvement
- **🆕 Real-Time Progress Tracking**: Live upload progress with speed, ETA, and chunk-level status
- **🆕 Intelligent Chunking**: Advanced text segmentation with context preservation
- **🆕 Video Frame Analysis**: Automatic extraction and analysis of video content

### 🔍 Advanced RAG Search
- **🆕 Multi-Strategy Search**: Hybrid vector similarity, full-text, and semantic search
- **🆕 Intelligent Query Routing**: Automatic query classification and optimization
- **🆕 Multi-Modal Search**: Search across text, audio transcriptions, and video frames
- **Enhanced Filtering**: Filter by document type, media type, tags, and content features
- **Real-time Results**: Ultra-fast search with advanced similarity scoring

### 💬 Enhanced AI Chat Assistant
- **🆕 RAG-Powered Responses**: Advanced retrieval with context-aware generation
- **🆕 Multi-Modal Context**: Chat about video content, images, and technical diagrams
- **Document Chat**: Ask questions about your documents with improved accuracy
- **Contextual Filtering**: Focus conversations by selecting specific tags and document types
- **Source Citations**: See which documents were used to generate responses with frame-level precision
- **Smart Context**: Enhanced AI analysis with technical content understanding

### 📊 Enhanced Analytics Dashboard
- **🆕 Multi-Modal Processing Status**: Monitor text, audio, video, and frame processing
- **🆕 RAG Performance Metrics**: Track search quality and response accuracy
- **Processing Status**: Real-time monitoring of document processing pipeline
- **File Type Distribution**: Visual breakdown of your document collection
- **Storage Analytics**: Track total documents and storage usage
- **Auto-refresh**: Live updates every 5 seconds

### 🤖 Advanced AI Processing Pipeline
- **🆕 Enhanced Text Extraction**: Intelligent chunking with overlap and context preservation
- **🆕 Video Frame Processing**: FFmpeg-based frame extraction with scene detection
- **🆕 Claude Vision Analysis**: Technical content detection (code, diagrams, UI elements)
- **🆕 Multi-Modal Embeddings**: Combined text and visual embeddings for enhanced search
- **Multi-Provider Transcription**: OpenAI Whisper (up to 25MB) with AssemblyAI fallback (up to 5GB)
- **Advanced Vector Embeddings**: Enhanced semantic search with text-embedding-3-small
- **Background Processing**: Automated pipeline with API endpoints and monitoring
- **Auto-Recovery**: Continuous daemon prevents documents from getting stuck in processing

### 🎯 New Multi-Modal Capabilities
- **🆕 Video Content Analysis**: Extract and analyze frames from MP4/MOV files
- **🆕 Technical Content Detection**: Identify code, diagrams, and UI elements in videos
- **🆕 Scene-Based Search**: Search video content by timestamp and visual similarity
- **🆕 Combined Text-Visual Search**: Unified search across all content modalities
- **🆕 Frame-Level Citations**: Reference specific video moments in chat responses

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
   - **Search**: `/kms/search` - Enhanced RAG search with multi-modal capabilities
   - **Chat**: `/kms/chat` - AI assistant with RAG-powered responses
   - **Status**: `/kms/status` - Monitor multi-modal processing pipeline

6. **🆕 Setup Enhanced Database Schema**
   ```bash
   # Execute in Supabase SQL Editor:
   # 1. MANUAL_SCHEMA_MIGRATION.sql (Phase 1 enhancements)
   # 2. MONITORING_TABLES.sql (Performance tracking)
   # 3. VIDEO_FRAMES_SCHEMA_FIXED.sql (Phase 2 multi-modal support)
   ```

## 🛠️ Setup & Configuration
See [SETUP.md](./SETUP.md) for detailed setup instructions, including:
- **🆕 Enhanced database schema** with pgvector optimizations
- **🆕 Multi-modal processing setup** with Claude Vision API
- Supabase database schema and storage bucket setup
- Required environment variables (now includes Claude API key)
- Enabling vector search (pgvector) with performance indexes

## 🗂️ Project Structure
```
src/
├── app/
│   ├── page.tsx                     # Dashboard with enhanced analytics
│   ├── upload/page.tsx              # 🆕 Enhanced upload with multi-modal support
│   ├── search/page.tsx              # 🆕 Multi-modal RAG search interface
│   ├── chat/page.tsx                # 🆕 RAG-powered chat with multi-modal context
│   ├── status/page.tsx              # 🆕 Multi-modal processing status monitor
│   └── api/
│       ├── chat/route.ts            # 🆕 Enhanced AI chat with RAG integration
│       ├── search/route.ts          # 🆕 Multi-strategy search API
│       ├── search-multimodal/       # 🆕 Multi-modal search endpoint
│       ├── intelligent-search/      # 🆕 RAG search with query analysis
│       ├── process-video/           # 🆕 Video frame processing API
│       ├── documents/[id]/          # Enhanced document CRUD operations
│       ├── dashboard-stats/         # Enhanced analytics with multi-modal data
│       ├── process-documents/       # Enhanced processing pipeline
│       └── background-process/      # Automated multi-modal processing
├── utils/
│   ├── enhancedDocumentProcessor.ts # 🆕 Intelligent chunking and processing
│   ├── enhancedEmbeddingService.ts  # 🆕 Advanced embedding with caching
│   ├── enhancedRagService.ts        # 🆕 Multi-strategy RAG implementation
│   ├── ragMiddleware.ts             # 🆕 Query analysis and routing
│   ├── videoProcessingService.ts    # 🆕 Video frame extraction with FFmpeg
│   ├── claudeVisionService.ts       # 🆕 Claude Vision API integration
│   ├── multiModalEmbeddingService.ts# 🆕 Combined text-visual embeddings
│   ├── monitoringService.ts         # 🆕 Performance tracking and logging
│   ├── transcriptionService.ts     # Enhanced multi-provider transcription
│   └── supabase/
│       ├── client.ts                # Client-side Supabase
│       └── serverClients.ts         # Server-side Supabase with enhanced queries
├── components/
│   ├── ClientLayout.tsx             # Main layout with enhanced sidebar
│   ├── ChakraProviders.tsx          # Theme and UI providers
│   └── theme.ts                     # Dark/light mode theming
└── scripts/
    └── process-documents.js         # Enhanced background processing scripts
```

## 🚀 Upload Performance Optimization

### **Chunked Upload System**
- **Smart File Size Detection**: Automatic optimization based on file size
  - Files <50MB: Direct upload with progress tracking
  - Files 50MB-5GB: Intelligent chunked upload with parallel processing
- **Parallel Processing**: Up to 3 concurrent chunks uploading simultaneously
- **10MB Chunk Size**: Optimized chunk size for best performance and reliability
- **Automatic Retry Logic**: Failed chunks retry with exponential backoff
- **Semaphore Control**: Prevents server overload while maximizing throughput

### **Real-Time Progress Tracking**
- **Live Upload Metrics**: Real-time speed, percentage, and ETA calculations
- **Chunk-Level Progress**: Visual indication of current chunk vs total chunks
- **Professional UI**: Animated progress bars with visual feedback
- **Error Handling**: Clear error messages with actionable suggestions
- **Upload Speed Display**: Live MB/s or GB/s transfer rate monitoring

### **Performance Gains**
- **Small Files (<50MB)**: Improved progress tracking, similar upload speed
- **Medium Files (50MB-500MB)**: 2-3x faster upload with chunked processing
- **Large Files (500MB-5GB)**: 3-5x faster upload with parallel chunk uploads
- **Network Reliability**: Individual chunk retry prevents full upload restart
- **User Experience**: Professional progress feedback eliminates upload uncertainty

## 🧪 Enhanced Multi-Modal Processing Pipeline
1. **Upload**: Files uploaded to Supabase Storage with enhanced metadata collection
2. **🆕 Intelligent Text Processing**: Advanced chunking with context preservation and overlap
3. **🆕 Video Frame Extraction**: FFmpeg-based extraction with scene detection and key frame identification
4. **🆕 Claude Vision Analysis**: Technical content detection for code, diagrams, and UI elements
5. **Smart Transcription**: Audio/video files processed with intelligent provider selection:
   - Files ≤25MB: OpenAI Whisper (faster, higher quality)
   - Files >25MB: Automatic fallback to AssemblyAI (supports up to 5GB)
6. **🆕 Multi-Modal Embeddings**: Combined text and visual embeddings for enhanced semantic search
7. **🆕 RAG Integration**: Advanced retrieval with context-aware generation
8. **Quality Assurance**: Multi-modal processing status tracked with comprehensive error handling
9. **Real-time Updates**: Monitor all processing stages via enhanced dashboard
10. **Auto-Recovery**: Background daemon ensures no documents get stuck in any processing stage

### Enhanced Background Processing Commands
```bash
# Process all pending documents (now includes multi-modal processing)
npx tsx scripts/process-documents.ts process_all

# Process specific content types
npx tsx scripts/process-documents.ts process_text        # Enhanced chunking
npx tsx scripts/process-documents.ts process_transcriptions  # Multi-provider
npx tsx scripts/process-documents.ts process_embeddings     # Multi-modal embeddings

# 🆕 Process video content
npx tsx scripts/process-documents.ts process_video_frames   # Frame extraction
npx tsx scripts/process-documents.ts process_vision        # Claude Vision analysis

# Auto-processing daemon (prevents stuck documents in any stage)
node scripts/auto-process-daemon.js

# Enhanced API endpoints for automation
curl -X POST http://localhost:3001/kms/api/background-process \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"action":"process_all"}'

# 🆕 Multi-modal processing endpoints
curl -X POST http://localhost:3001/kms/api/process-video \
  -H "Content-Type: application/json" \
  -d '{"documentId":"uuid","enableVisionAnalysis":true}'

# Check processing status (now includes multi-modal metrics)
curl http://localhost:3001/kms/api/background-process
```

## 💡 Enhanced Usage Examples

### 🆕 Multi-Modal Chat Assistant
Ask questions about all types of content:
- **Text Analysis**: "Summarize the key decisions from the latest meeting"
- **Video Content**: "What code examples were shown in the development training video?"
- **Technical Documentation**: "Show me all diagrams related to our system architecture"
- **Cross-Modal Search**: "Find all references to the user authentication flow across documents and videos"

### 🆕 Advanced RAG Search
- **Semantic Search**: Find content by meaning, not just keywords
- **Multi-Modal Queries**: Search across text, audio transcriptions, and video frames
- **Technical Content**: Locate specific code snippets or architectural diagrams
- **Contextual Results**: Get precise answers with source citations and timestamps

### 🆕 Enhanced Filtering & Discovery
- **Content Type Filtering**: Filter by document type, media type, and visual content
- **Technical Content Filters**: Find documents containing code, diagrams, or UI elements
- **Tag-Based Organization**: Use enhanced tagging system for precise categorization
- **Timeline Navigation**: Navigate video content by scene and timestamp

### 🆕 Intelligent Document Management
- **Multi-Modal Processing**: Automatic analysis of text, audio, and video content
- **Technical Content Detection**: Identify and extract code, diagrams, and technical concepts
- **Performance Monitoring**: Track processing status across all content types
- **Quality Metrics**: Monitor search performance and content analysis accuracy

## 🔧 Enhanced Technical Stack
- **Frontend**: Next.js 15.3.3, React, TypeScript, Chakra UI with enhanced theming
- **Backend**: Next.js API Routes, Supabase PostgreSQL + pgvector with optimized indexes
- **🆕 RAG Architecture**:
  - **Enhanced Retrieval**: Multi-strategy search with intelligent query routing
  - **Context Management**: Advanced chunking with overlap and context preservation
  - **Generation**: RAG-powered responses with multi-modal context
- **🆕 AI Services**: 
  - **Chat**: OpenAI GPT-4o-mini with RAG integration for enhanced conversations
  - **Vision**: Claude Vision API for technical content analysis
  - **Transcription**: OpenAI Whisper + AssemblyAI fallback with intelligent routing
  - **Embeddings**: OpenAI text-embedding-3-small with multi-modal combinations
- **🆕 Multi-Modal Processing**:
  - **Video**: FFmpeg for frame extraction and scene detection
  - **Vision Analysis**: Claude Vision for code, diagram, and UI detection
  - **Content Recognition**: Technical content identification and extraction
- **Storage**: Supabase Storage with enhanced metadata and vector search
- **🆕 Monitoring**: Comprehensive performance tracking and logging system
- **Processing**: Enhanced multi-provider background workers with auto-recovery

## ⚡ What's New in Version 2.0

### **User Experience Improvements**
- **🆕 Multi-Modal Search**: Search across text, audio, and video content seamlessly
- **🆕 Enhanced Chat**: Ask questions about video content, code examples, and technical diagrams
- **🆕 Visual Content Discovery**: Find documents containing specific visual elements or technical content
- **🆕 Performance Metrics**: Real-time monitoring of search quality and processing performance
- **🆕 Intelligent Processing**: Automatic detection and extraction of technical content from videos
- **🆕 Optimized Large File Uploads**: 3-5x faster uploads for files 200MB-5GB with real-time progress tracking

### **Technical Enhancements**
- **🆕 RAG Architecture**: Advanced retrieval-augmented generation for more accurate responses
- **🆕 Multi-Modal Embeddings**: Combined text and visual embeddings for enhanced semantic search
- **🆕 Claude Vision Integration**: Sophisticated analysis of technical content in video frames
- **🆕 Advanced Chunking**: Intelligent text segmentation with context preservation
- **🆕 Performance Monitoring**: Comprehensive logging and analytics for system optimization

### **Developer Experience**
- **🆕 Enhanced API Endpoints**: New multi-modal search and processing capabilities
- **🆕 Modular Architecture**: Clean separation of RAG components for easier maintenance
- **🆕 Advanced Monitoring**: Detailed performance tracking and error handling
- **🆕 Extensible Framework**: Easy integration of new AI services and processing capabilities

## 🤝 Contributing
- Please read the code, test features, and suggest improvements!
- New developers: see [SETUP.md](./SETUP.md) for a step-by-step guide
- **🆕 Multi-Modal Testing**: Test video processing and vision analysis features
- Report issues or feature requests via GitHub Issues

## 📞 Support
If you have questions or need help, check the [SETUP.md](./SETUP.md) or reach out to the project maintainer.

---

**🚀 Ready to transform your knowledge management with RAG and multi-modal AI?** Get started with the enhanced KMS today!
