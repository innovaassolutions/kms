#!/usr/bin/env node

/**
 * Auto-processing daemon for KMS documents
 * 
 * This script runs continuously and processes pending documents every 30 seconds
 * to ensure no documents get stuck in processing.
 * 
 * Usage:
 *   node scripts/auto-process-daemon.js
 * 
 * Environment Variables:
 *   - API_URL: Base URL for the API (default: http://localhost:3001)
 *   - PROCESS_INTERVAL: Interval in seconds (default: 30)
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';
const PROCESS_INTERVAL = parseInt(process.env.PROCESS_INTERVAL || '30', 10) * 1000;

console.log(`🚀 Starting KMS Auto-Processing Daemon`);
console.log(`📡 API URL: ${API_URL}`);
console.log(`⏰ Check Interval: ${PROCESS_INTERVAL / 1000} seconds`);

async function checkAndProcess() {
  try {
    // Check for pending documents
    const checkResponse = await fetch(`${API_URL}/kms/api/background-process`);
    if (!checkResponse.ok) {
      throw new Error(`Check request failed: ${checkResponse.status}`);
    }
    
    const checkData = await checkResponse.json();
    const pendingCount = checkData.pendingCount || 0;
    
    if (pendingCount > 0) {
      console.log(`📋 Found ${pendingCount} pending documents - triggering processing...`);
      
      // Trigger processing
      const processResponse = await fetch(`${API_URL}/kms/api/background-process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.BACKGROUND_PROCESS_API_KEY}`
        },
        body: JSON.stringify({ action: 'process_all' })
      });
      
      if (!processResponse.ok) {
        throw new Error(`Process request failed: ${processResponse.status}`);
      }
      
      const processData = await processResponse.json();
      console.log(`✅ Processed ${processData.processed} documents, ${processData.failed} failed`);
      
      if (processData.results && processData.results.length > 0) {
        processData.results.forEach(result => {
          const status = result.status === 'success' ? '✅' : '❌';
          console.log(`   ${status} ${result.title} (${result.id})`);
          if (result.error) {
            console.log(`      Error: ${result.error.substring(0, 100)}...`);
          }
        });
      }
    } else {
      console.log(`😴 No pending documents`);
    }
  } catch (error) {
    console.error(`❌ Auto-processing error:`, error.message);
  }
}

async function main() {
  console.log(`🔄 Starting periodic checks...`);
  
  // Initial check
  await checkAndProcess();
  
  // Set up periodic checks
  setInterval(async () => {
    const timestamp = new Date().toISOString();
    console.log(`\n🕐 [${timestamp}] Checking for pending documents...`);
    await checkAndProcess();
  }, PROCESS_INTERVAL);
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Received SIGINT - shutting down gracefully...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Received SIGTERM - shutting down gracefully...');
  process.exit(0);
});

// Start the daemon
main().catch(error => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});