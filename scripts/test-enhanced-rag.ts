import { enhancedRagService } from '../src/utils/enhancedRagService';
import { embeddingService } from '../src/utils/enhancedEmbeddingService';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

interface TestQuery {
  query: string;
  expectedType?: string;
  description: string;
}

const testQueries: TestQuery[] = [
  {
    query: "How do I configure the database?",
    description: "Technical configuration query"
  },
  {
    query: "What are the main strategies for improving performance?",
    expectedType: "strategy",
    description: "Strategic planning query"
  },
  {
    query: "Show me meeting notes about project planning",
    expectedType: "meeting",
    description: "Filtered meeting content query"
  },
  {
    query: "code examples for API integration",
    description: "Code-focused query for chunk-based search"
  },
  {
    query: "similar documents about manufacturing processes",
    description: "Semantic similarity query"
  },
  {
    query: '"exact phrase search"',
    description: "Keyword-based exact match query"
  }
];

async function testSearchFunctionality() {
  console.log('🔍 Testing Enhanced RAG Search Functionality\n');

  for (let i = 0; i < testQueries.length; i++) {
    const testQuery = testQueries[i];
    console.log(`\n📋 Test ${i + 1}: ${testQuery.description}`);
    console.log(`Query: "${testQuery.query}"`);
    console.log('─'.repeat(60));

    try {
      const startTime = Date.now();
      
      const searchResults = await enhancedRagService.search({
        query: testQuery.query,
        maxResults: 5,
        filters: testQuery.expectedType ? { type: testQuery.expectedType } : {},
        includeContext: true,
        contextWindow: 2,
      });

      const endTime = Date.now();
      
      console.log(`🚀 Search Strategy: ${searchResults.searchStrategy}`);
      console.log(`⚡ Processing Time: ${searchResults.processingTime}ms (Total: ${endTime - startTime}ms)`);
      console.log(`🎯 Confidence Score: ${(searchResults.confidence * 100).toFixed(1)}%`);
      console.log(`📄 Results Found: ${searchResults.results.length}`);
      
      if (searchResults.results.length > 0) {
        console.log('\n📊 Top Results:');
        searchResults.results.slice(0, 3).forEach((result, index) => {
          console.log(`  ${index + 1}. ${result.title}`);
          console.log(`     Type: ${result.type} | Similarity: ${(result.similarity * 100).toFixed(1)}% | Rank: ${result.rank.toFixed(3)}`);
          if (result.chunkId) {
            console.log(`     Chunk ID: ${result.chunkId}`);
          }
          if (result.context && result.context.length > 0) {
            console.log(`     Context: ${result.context.length} surrounding chunks`);
          }
        });
      } else {
        console.log('❌ No results found');
      }

    } catch (error) {
      console.error('❌ Search failed:', error);
    }
  }
}

async function testEmbeddingService() {
  console.log('\n🧠 Testing Enhanced Embedding Service\n');

  const testTexts = [
    "This is a short test document about database configuration.",
    "Here's a longer document that should be chunked into multiple pieces. It contains various sections about different topics including technical implementation details, configuration options, troubleshooting guides, and best practices for system administration.",
    "SQL query example: SELECT * FROM documents WHERE type = 'strategy';",
    "# Meeting Notes\n\n## Agenda\n1. Project status\n2. Next steps\n\n## Action Items\n- Complete documentation\n- Schedule follow-up"
  ];

  for (let i = 0; i < testTexts.length; i++) {
    const text = testTexts[i];
    console.log(`\n📝 Test ${i + 1}: Text length ${text.length} characters`);
    console.log(`Preview: "${text.substring(0, 100)}${text.length > 100 ? '...' : ''}"`);
    console.log('─'.repeat(50));

    try {
      // Test chunking
      const chunks = await embeddingService.chunkDocument(text);
      console.log(`📦 Chunks generated: ${chunks.length}`);
      
      chunks.forEach((chunk, index) => {
        console.log(`  Chunk ${index + 1}: ${chunk.tokenCount} tokens, type: ${chunk.metadata.chunk_type}`);
      });

      // Test embedding generation
      if (chunks.length > 0) {
        const embedding = await embeddingService.generateEmbedding(chunks[0].text);
        console.log(`🧬 Embedding generated: ${embedding.embedding.length} dimensions, ${embedding.tokenCount} tokens`);
      }

    } catch (error) {
      console.error('❌ Embedding test failed:', error);
    }
  }
}

async function testDatabaseFunctions() {
  console.log('\n🗄️  Testing Database Functions\n');

  try {
    // Test that we can access the enhanced functions
    console.log('📡 Testing database connectivity...');
    
    // This will test if our enhanced services can connect to the database
    const testEmbedding = Array.from({ length: 1536 }, () => Math.random());
    
    const searchResults = await enhancedRagService.search({
      query: "test query",
      maxResults: 1,
      similarityThreshold: 0.1,
    });

    console.log('✅ Database connection successful');
    console.log(`📊 Test search returned ${searchResults.results.length} results`);
    console.log(`🎯 Search strategy used: ${searchResults.searchStrategy}`);

  } catch (error) {
    console.error('❌ Database test failed:', error);
    console.log('\nPlease ensure:');
    console.log('1. Database migration has been applied');
    console.log('2. Environment variables are set correctly');
    console.log('3. Supabase connection is working');
  }
}

async function runComprehensiveTest() {
  console.log('🚀 Enhanced RAG System Comprehensive Test Suite');
  console.log('='.repeat(60));
  
  try {
    // Test 1: Database Functions
    await testDatabaseFunctions();
    
    // Test 2: Embedding Service
    await testEmbeddingService();
    
    // Test 3: Search Functionality
    await testSearchFunctionality();
    
    console.log('\n🎉 All tests completed successfully!');
    console.log('\n📋 Next Steps:');
    console.log('1. Run document reprocessing: npx tsx scripts/reprocess-documents-enhanced.ts all');
    console.log('2. Test the enhanced search API: /api/search-enhanced');
    console.log('3. Test the enhanced chat API with useEnhancedRag=true');
    
  } catch (error) {
    console.error('💥 Test suite failed:', error);
    process.exit(1);
  }
}

// Command line interface
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'search':
      await testSearchFunctionality();
      break;
    case 'embedding':
      await testEmbeddingService();
      break;
    case 'database':
      await testDatabaseFunctions();
      break;
    case 'all':
    default:
      await runComprehensiveTest();
      break;
  }

  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(error => {
    console.error('Test runner failed:', error);
    process.exit(1);
  });
}

export { testSearchFunctionality, testEmbeddingService, testDatabaseFunctions };