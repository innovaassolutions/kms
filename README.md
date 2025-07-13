# 🧠 Innovaas Enhanced RAG Knowledge Management System (KMS)

Welcome to the next-generation Innovaas KMS! This comprehensive **Retrieval-Augmented Generation (RAG)** platform combines intelligent document processing, multi-modal AI analysis, and advanced vector search capabilities to create a powerful knowledge management solution for your organization.

## 🎯 **What is this system?**

The Innovaas KMS is an **enterprise-grade knowledge management platform** designed to:
- **Transform unstructured data** into searchable, actionable knowledge
- **Process multi-modal content** (text, audio, video) with AI-powered analysis
- **Enable semantic search** across all your organization's knowledge base
- **Provide intelligent chat assistance** with RAG-powered responses
- **Extract insights** from technical content like code, diagrams, and presentations

## 🏗️ **How it's built**

### **Core Architecture**
- **Next.js 15 Full-Stack App** - Modern React framework with API routes
- **Supabase Backend** - PostgreSQL database with pgvector for semantic search
- **Multi-Modal AI Pipeline** - Integrated transcription, vision analysis, and embeddings
- **Enhanced RAG System** - Advanced retrieval with context-aware generation

### **AI-Powered Processing Pipeline**
1. **Document Upload** → Supabase Storage with metadata extraction
2. **Content Analysis** → Text extraction, audio transcription, video frame analysis
3. **AI Enhancement** → Claude Vision for technical content, embeddings generation
4. **Vector Storage** → pgvector database for semantic search
5. **RAG Integration** → Context-aware chat and search capabilities

## 🆕 **Major Version 2.0 Release - Enhanced RAG Platform**

This release transforms the KMS from a simple document manager into a sophisticated RAG-powered knowledge platform with comprehensive multi-modal capabilities:

### **Phase 1: Enhanced Foundation** ✅ COMPLETED
- ✅ **Advanced pgvector capabilities** with optimized similarity search
- ✅ **Intelligent document chunking** for better context preservation
- ✅ **Enhanced RAG pipeline** with multiple search strategies
- ✅ **Smart middleware architecture** for query routing and analysis
- ✅ **Comprehensive monitoring** and performance tracking

### **Phase 2: Multi-Modal Processing** ✅ COMPLETED
- ✅ **Video frame extraction** with intelligent scene detection (FFmpeg)
- ✅ **Claude Vision API integration** for technical content analysis
- ✅ **Multi-modal embeddings** combining text and visual content
- ✅ **Advanced database schema** for video frames and visual search
- ✅ **AssemblyAI integration** for enhanced transcription (up to 5GB files)
- ✅ **Complete error recovery system** - All processing failures resolved

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
- **✅ Robust Transcription**: AssemblyAI primary service with technical term boosting (up to 5GB)
- **✅ Error Recovery System**: Complete processing failure recovery (105/105 videos processed)
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

## 🛠️ **Built with** (Technology Stack)

### **Frontend Technologies**
- **Next.js 15.3.3** - React framework with App Router and API routes
- **TypeScript** - Type-safe development with strict mode
- **Chakra UI 2.10.1** - Component library with dark/light theming
- **React Hooks** - Modern state management and effects

### **Backend & Database**
- **Supabase** - Backend-as-a-Service with PostgreSQL + pgvector
- **pgvector Extension** - Vector similarity search with 1536-dimensional embeddings
- **Row Level Security** - Secure multi-tenant data access
- **Supabase Storage** - File storage with automatic compression

### **AI & Processing Services**
- **OpenAI GPT-4o-mini** - RAG-powered chat responses
- **OpenAI text-embedding-3-small** - Semantic vector embeddings (1536 dimensions)
- **AssemblyAI** - High-quality transcription with technical term boosting (up to 5GB)
- **Claude Vision API** - Technical content analysis (code, diagrams, UI detection)
- **FFmpeg** - Video frame extraction with scene detection

### **Infrastructure & Processing**
- **Node.js Runtime** - Server-side JavaScript execution
- **Background Workers** - Automated document processing pipeline
- **PM2 Process Manager** - Production process management
- **RESTful APIs** - Clean API design with TypeScript validation

## 🏢 **Built for** (Use Cases)

### **Enterprise Knowledge Management**
- **Technical Documentation** - API docs, system architecture, code examples
- **Training Materials** - Video tutorials, presentations, workshop recordings
- **Meeting Records** - Transcriptions, decisions, action items
- **Project Documentation** - Plans, charters, status reports
- **Standard Operating Procedures** - SOPs, workflows, guidelines

### **Development Teams**
- **Code Review Materials** - Technical discussions, code walkthroughs
- **Architecture Documentation** - System designs, diagrams, technical specs
- **Learning Resources** - Training videos, coding tutorials, best practices
- **Knowledge Sharing** - Cross-team communication, expertise transfer

### **Business Operations**
- **Strategic Planning** - Business strategies, market analysis, planning docs
- **Process Documentation** - Operational procedures, workflow guides
- **Communication Archives** - Important emails, announcements, decisions
- **Research & Analysis** - Market research, competitive analysis, whitepapers

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

## 🚀 **How to use it** (Getting Started)

### **1. Quick Setup**
```bash
# Clone and install
git clone <repository-url>
cd kms
npm install

# Configure environment
cp .env.local.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

### **2. Access the Platform**
- **Dashboard**: `http://localhost:3001/kms` - Analytics and overview
- **Upload**: `http://localhost:3001/kms/upload` - Add documents/media
- **Search**: `http://localhost:3001/kms/search` - Multi-modal search
- **Chat**: `http://localhost:3001/kms/chat` - AI assistant
- **Status**: `http://localhost:3001/kms/status` - Processing monitor

### **3. Upload Content**
1. **Drag & Drop Files** - PDF, DOCX, TXT, MP3, WAV, MP4, MOV (up to 5GB)
2. **Add Metadata** - Title, document type, tags
3. **Auto-Processing** - System automatically extracts text, transcribes audio/video, generates embeddings

### **4. Search & Discover**
- **Semantic Search** - Find content by meaning, not just keywords
- **Multi-Modal Queries** - Search across text, audio transcriptions, and video frames
- **Advanced Filters** - Filter by type, media, tags, and content features
- **Visual Results** - See matched content with source citations

### **5. AI Chat Assistant**
- **Ask Questions** - "What were the key decisions in last week's meeting?"
- **Technical Queries** - "Show me code examples from the training videos"
- **Cross-Modal Search** - "Find all references to user authentication"
- **Source Citations** - Get precise answers with document/timestamp references

## 🧪 Enhanced Multi-Modal Processing Pipeline
1. **Upload**: Files uploaded to Supabase Storage with enhanced metadata collection
2. **🆕 Intelligent Text Processing**: Advanced chunking with context preservation and overlap
3. **🆕 Video Frame Extraction**: FFmpeg-based extraction with scene detection and key frame identification
4. **🆕 Claude Vision Analysis**: Technical content detection for code, diagrams, and UI elements
5. **✅ Robust Transcription**: AssemblyAI primary service with technical term boosting:
   - **All File Sizes**: AssemblyAI handles files up to 5GB with high accuracy
   - **Technical Terms**: Boosted recognition for MES, OEE, UNS, MQTT, IoT, SCADA terms
   - **Speaker Diarization**: Identifies different speakers in audio/video
6. **🆕 Multi-Modal Embeddings**: Combined text and visual embeddings for enhanced semantic search
7. **🆕 RAG Integration**: Advanced retrieval with context-aware generation
8. **✅ Quality Assurance**: Complete error recovery system - 105/105 videos successfully processed
9. **Real-time Updates**: Monitor all processing stages via enhanced dashboard
10. **Auto-Recovery**: Background daemon ensures no documents get stuck in any processing stage

### **6. Background Processing & Management**

#### **Enhanced Video Transcription Script**
```bash
# Process all videos with AssemblyAI + frame extraction
node transcribe-videos.js

# Features:
# - AssemblyAI transcription with technical term boosting
# - Automatic video frame extraction using FFmpeg
# - Claude Vision analysis for technical content
# - Error recovery and batch processing
# - Real-time progress tracking
```

#### **Background Processing Commands**
```bash
# Process all pending documents (multi-modal processing)
npx tsx scripts/process-documents.ts process_all

# Process specific content types
npx tsx scripts/process-documents.ts process_text        # Enhanced chunking
npx tsx scripts/process-documents.ts process_transcriptions  # Multi-provider
npx tsx scripts/process-documents.ts process_embeddings     # Multi-modal embeddings

# 🆕 Process video content
npx tsx scripts/process-documents.ts process_video_frames   # Frame extraction
npx tsx scripts/process-documents.ts process_vision        # Claude Vision analysis

# Auto-processing daemon (prevents stuck documents)
node scripts/auto-process-daemon.js

# Enhanced API endpoints for automation
curl -X POST http://localhost:3001/kms/api/background-process \
  -H "Authorization: Bearer YOUR_API_KEY" \
  -d '{"action":"process_all"}'

# 🆕 Multi-modal processing endpoints
curl -X POST http://localhost:3001/kms/api/process-video \
  -H "Content-Type: application/json" \
  -d '{"documentId":"uuid","enableVisionAnalysis":true}'

# Check processing status (multi-modal metrics)
curl http://localhost:3001/kms/api/background-process
```

#### **Production Deployment with PM2**
```bash
# Start all KMS processes
pm2 start ecosystem.config.js

# Individual process management
pm2 stop kms-server              # Stop KMS server
pm2 stop kms-auto-process        # Stop auto-process daemon
pm2 restart kms-server           # Restart KMS server
pm2 logs kms-server              # View KMS server logs
pm2 logs kms-auto-process        # View auto-process logs
pm2 list                         # List all PM2 processes
pm2 save                         # Save current process list
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

### **🎯 Production Success Metrics**
- **✅ 105/105 Videos Processed** - Complete processing success with error recovery
- **✅ 1,000+ Frames Extracted** - Comprehensive video content analysis
- **✅ 45 Videos with Visual Content** - Multi-modal search capabilities
- **✅ Zero Processing Errors** - Robust error handling and recovery system
- **✅ AssemblyAI Integration** - Enhanced transcription with technical term boosting

### **User Experience Improvements**
- **🆕 Multi-Modal Search**: Search across text, audio, and video content seamlessly
- **🆕 Enhanced Chat**: Ask questions about video content, code examples, and technical diagrams
- **🆕 Visual Content Discovery**: Find documents containing specific visual elements or technical content
- **🆕 Performance Metrics**: Real-time monitoring of search quality and processing performance
- **🆕 Intelligent Processing**: Automatic detection and extraction of technical content from videos
- **🆕 Optimized Large File Uploads**: 3-5x faster uploads for files 200MB-5GB with real-time progress tracking

### **Technical Enhancements**
- **✅ RAG Architecture**: Advanced retrieval-augmented generation for more accurate responses
- **✅ Multi-Modal Embeddings**: Combined text and visual embeddings for enhanced semantic search
- **✅ Claude Vision Integration**: Sophisticated analysis of technical content in video frames
- **✅ Advanced Chunking**: Intelligent text segmentation with context preservation
- **✅ Performance Monitoring**: Comprehensive logging and analytics for system optimization
- **✅ Error Recovery System**: Complete processing failure recovery with batch reprocessing

### **Developer Experience**
- **✅ Enhanced API Endpoints**: New multi-modal search and processing capabilities
- **✅ Modular Architecture**: Clean separation of RAG components for easier maintenance
- **✅ Advanced Monitoring**: Detailed performance tracking and error handling
- **✅ Extensible Framework**: Easy integration of new AI services and processing capabilities
- **✅ Production-Ready Scripts**: Robust video processing with AssemblyAI integration

## 🌟 **Current System Status**

### **✅ Fully Operational Features**
- **Document Upload & Processing** - All file types supported up to 5GB
- **Video Transcription** - 105/105 videos successfully processed with AssemblyAI
- **Frame Extraction** - 1,000+ video frames extracted and analyzed
- **Multi-Modal Search** - Text, audio, and video content searchable
- **RAG Chat Assistant** - AI-powered responses with source citations
- **Background Processing** - Automated pipeline with error recovery

### **📊 Performance Metrics**
- **Processing Success Rate**: 100% (105/105 videos)
- **Error Recovery**: Complete (36 failed videos successfully reprocessed)
- **Frame Extraction**: 45 videos with visual content analysis
- **Storage**: PostgreSQL + pgvector with 1536-dimensional embeddings
- **Transcription Quality**: Enhanced with technical term boosting

## 🔧 **Environment Requirements**

### **Required API Keys**
```bash
# Core Services
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
OPENAI_API_KEY=your_openai_api_key

# Enhanced Transcription
ASSEMBLYAI_API_KEY=your_assemblyai_api_key  # For large video files

# Multi-Modal Processing (Optional)
CLAUDE_API_KEY=your_claude_api_key          # For vision analysis

# Background Processing
BACKGROUND_PROCESS_API_KEY=secure_random_string
API_URL=http://localhost:3001
```

### **System Dependencies**
- **Node.js 18+** - JavaScript runtime
- **FFmpeg** - Video frame extraction
- **PostgreSQL** - Database with pgvector extension
- **PM2** - Production process management (optional)

### **Development Server**
- **Port**: 3001 (configurable)
- **Base Path**: `/kms` (all routes prefixed)
- **Hot Reload**: Turbopack for fast development

## 🤝 Contributing
- Please read the code, test features, and suggest improvements!
- New developers: see [SETUP.md](./SETUP.md) for a step-by-step guide
- **🆕 Multi-Modal Testing**: Test video processing and vision analysis features
- Report issues or feature requests via GitHub Issues

## 📞 Support
If you have questions or need help, check the [SETUP.md](./SETUP.md) or reach out to the project maintainer.

---

**🚀 Ready to transform your knowledge management with RAG and multi-modal AI?** Get started with the enhanced KMS today!
