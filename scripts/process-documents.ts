#!/usr/bin/env node

/**
 * Background Document Processing Script (TypeScript)
 * 
 * This script can be run as a cron job to automatically process pending documents.
 * 
 * Usage:
 * - npx tsx scripts/process-documents.ts process_all
 * - npx tsx scripts/process-documents.ts process_text
 * - npx tsx scripts/process-documents.ts process_transcriptions
 * - npx tsx scripts/process-documents.ts process_embeddings
 * 
 * To set up as a cron job (runs every 5 minutes):
 * 0/5 * * * * cd /path/to/your/kms && npx tsx scripts/process-documents.ts process_all
 */

import https from 'https';
import http from 'http';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3001/api/background-process';
const API_KEY = process.env.BACKGROUND_PROCESS_API_KEY || '';

// Types
type ProcessingAction = 'process_all' | 'process_text' | 'process_transcriptions' | 'process_embeddings';

interface ProcessingResponse {
  success: boolean;
  message: string;
  results: {
    processed: number;
    errors: number;
    details: string[];
  };
}

// Get action from command line arguments
const action: ProcessingAction = (process.argv[2] as ProcessingAction) || 'process_all';

// Validate action
const validActions: ProcessingAction[] = ['process_all', 'process_text', 'process_transcriptions', 'process_embeddings'];
if (!validActions.includes(action)) {
  console.error('Invalid action. Use one of:', validActions.join(', '));
  process.exit(1);
}

// Function to make HTTP request with body
function makeRequestWithBody(url: string, options: any, body: string): Promise<{ status: number; data: any }> {
  return new Promise((resolve, reject) => {
    const protocol = url.startsWith('https:') ? https : http;
    
    const req = protocol.request(url, options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({ status: res.statusCode || 500, data: jsonData });
        } catch (error) {
          resolve({ status: res.statusCode || 500, data: data });
        }
      });
    });
    
    req.on('error', (error) => {
      reject(error);
    });
    
    // Write the request body
    req.write(body);
    req.end();
  });
}

// Main processing function
async function processDocuments(): Promise<void> {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] Starting background processing for action: ${action}`);
  
  try {
    // Prepare request options
    const requestData = JSON.stringify({ action });
    const url = new URL(API_URL);
    
    const options = {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(requestData),
        ...(API_KEY && { 'Authorization': `Bearer ${API_KEY}` })
      }
    };
    
    // Make the request with body
    const response = await makeRequestWithBody(API_URL, options, requestData);
    
    if (response.status === 200) {
      console.log(`[${timestamp}] ✅ Processing completed successfully`);
      console.log(`[${timestamp}] Results:`, JSON.stringify(response.data, null, 2));
    } else {
      console.error(`[${timestamp}] ❌ Processing failed with status ${response.status}`);
      console.error(`[${timestamp}] Error:`, response.data);
    }
    
  } catch (error) {
    console.error(`[${timestamp}] ❌ Processing failed with error:`, error instanceof Error ? error.message : 'Unknown error');
  }
}

// Run the processing
processDocuments()
  .then(() => {
    console.log(`[${new Date().toISOString()}] Script completed`);
    process.exit(0);
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Script failed:`, error);
    process.exit(1);
  }); 