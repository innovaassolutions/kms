#!/usr/bin/env node

/**
 * Database Query Script to Check Pending Documents
 * 
 * This script queries the database to find documents that are stuck in pending status.
 * 
 * Usage:
 * npx tsx scripts/check-pending-documents.ts
 */

import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import { resolve } from 'path'

// Load environment variables
dotenv.config({ path: resolve(__dirname, '../.env.local') })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
})

async function checkPendingDocuments(): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] Checking for pending documents...`)
  
  try {
    // Get all documents with their processing status
    const { data: allDocuments, error: allError } = await supabase
      .from('documents')
      .select('*')
      .order('created_at', { ascending: false })
    
    if (allError) {
      console.error('Error fetching documents:', allError)
      return
    }
    
    console.log(`\n=== DOCUMENT STATUS SUMMARY ===`)
    console.log(`Total documents in database: ${allDocuments?.length || 0}`)
    
    if (!allDocuments || allDocuments.length === 0) {
      console.log('No documents found in database')
      return
    }
    
    // Group documents by status
    const statusCounts = allDocuments.reduce((acc, doc) => {
      const transcriptionStatus = doc.transcription_status || 'no_status'
      const hasContent = doc.content_text ? 'has_content' : 'no_content'
      const hasEmbedding = doc.embedding ? 'has_embedding' : 'no_embedding'
      
      acc[transcriptionStatus] = (acc[transcriptionStatus] || 0) + 1
      acc[hasContent] = (acc[hasContent] || 0) + 1
      acc[hasEmbedding] = (acc[hasEmbedding] || 0) + 1
      
      return acc
    }, {} as Record<string, number>)
    
    console.log('\n=== STATUS BREAKDOWN ===')
    console.log('Transcription Status:')
    Object.entries(statusCounts).forEach(([status, count]) => {
      if (status.includes('pending') || status.includes('completed') || status.includes('error') || status.includes('no_status')) {
        console.log(`  ${status}: ${count}`)
      }
    })
    
    console.log('\nContent Status:')
    console.log(`  has_content: ${statusCounts.has_content || 0}`)
    console.log(`  no_content: ${statusCounts.no_content || 0}`)
    
    console.log('\nEmbedding Status:')
    console.log(`  has_embedding: ${statusCounts.has_embedding || 0}`)
    console.log(`  no_embedding: ${statusCounts.no_embedding || 0}`)
    
    // Find documents with pending transcription
    const pendingTranscription = allDocuments.filter(doc => doc.transcription_status === 'pending')
    console.log(`\n=== PENDING TRANSCRIPTION DOCUMENTS (${pendingTranscription.length}) ===`)
    if (pendingTranscription.length > 0) {
      pendingTranscription.forEach(doc => {
        console.log(`ID: ${doc.id}`)
        console.log(`  Title: ${doc.title}`)
        console.log(`  Type: ${doc.type}`)
        console.log(`  Media Type: ${doc.media_type}`)
        console.log(`  File Path: ${doc.file_path}`)
        console.log(`  Created: ${doc.created_at}`)
        console.log(`  Status: ${doc.transcription_status}`)
        console.log(`  Has Content: ${doc.content_text ? 'Yes' : 'No'}`)
        console.log(`  Has Transcription: ${doc.transcription ? 'Yes' : 'No'}`)
        console.log(`  Has Embedding: ${doc.embedding ? 'Yes' : 'No'}`)
        console.log('---')
      })
    }
    
    // Find documents without content text
    const noContent = allDocuments.filter(doc => !doc.content_text)
    console.log(`\n=== DOCUMENTS WITHOUT CONTENT TEXT (${noContent.length}) ===`)
    if (noContent.length > 0) {
      noContent.forEach(doc => {
        console.log(`ID: ${doc.id}`)
        console.log(`  Title: ${doc.title}`)
        console.log(`  Type: ${doc.type}`)
        console.log(`  Media Type: ${doc.media_type}`)
        console.log(`  File Path: ${doc.file_path}`)
        console.log(`  Created: ${doc.created_at}`)
        console.log(`  Transcription Status: ${doc.transcription_status}`)
        console.log(`  Has Transcription: ${doc.transcription ? 'Yes' : 'No'}`)
        console.log('---')
      })
    }
    
    // Find documents without embeddings
    const noEmbedding = allDocuments.filter(doc => !doc.embedding)
    console.log(`\n=== DOCUMENTS WITHOUT EMBEDDINGS (${noEmbedding.length}) ===`)
    if (noEmbedding.length > 0) {
      noEmbedding.forEach(doc => {
        console.log(`ID: ${doc.id}`)
        console.log(`  Title: ${doc.title}`)
        console.log(`  Type: ${doc.type}`)
        console.log(`  Media Type: ${doc.media_type}`)
        console.log(`  Created: ${doc.created_at}`)
        console.log(`  Has Content: ${doc.content_text ? 'Yes' : 'No'}`)
        console.log(`  Has Transcription: ${doc.transcription ? 'Yes' : 'No'}`)
        console.log('---')
      })
    }
    
    // Show most recent documents
    console.log(`\n=== MOST RECENT DOCUMENTS (Last 5) ===`)
    const recentDocs = allDocuments.slice(0, 5)
    recentDocs.forEach(doc => {
      console.log(`ID: ${doc.id}`)
      console.log(`  Title: ${doc.title}`)
      console.log(`  Type: ${doc.type}`)
      console.log(`  Media Type: ${doc.media_type}`)
      console.log(`  File Path: ${doc.file_path}`)
      console.log(`  Created: ${doc.created_at}`)
      console.log(`  Transcription Status: ${doc.transcription_status}`)
      console.log(`  Has Content: ${doc.content_text ? 'Yes' : 'No'}`)
      console.log(`  Has Transcription: ${doc.transcription ? 'Yes' : 'No'}`)
      console.log(`  Has Embedding: ${doc.embedding ? 'Yes' : 'No'}`)
      console.log('---')
    })
    
    // Summary of issues
    console.log(`\n=== ISSUE SUMMARY ===`)
    console.log(`Documents with pending transcription: ${pendingTranscription.length}`)
    console.log(`Documents without content text: ${noContent.length}`)
    console.log(`Documents without embeddings: ${noEmbedding.length}`)
    
    const problematicDocs = new Set([
      ...pendingTranscription.map(d => d.id),
      ...noContent.map(d => d.id),
      ...noEmbedding.map(d => d.id)
    ])
    
    console.log(`Total unique documents with issues: ${problematicDocs.size}`)
    
  } catch (error) {
    console.error(`[${timestamp}] Error checking documents:`, error)
  }
}

// Run the check
checkPendingDocuments()
  .then(() => {
    console.log(`\n[${new Date().toISOString()}] Document check completed`)
    process.exit(0)
  })
  .catch((error) => {
    console.error(`[${new Date().toISOString()}] Document check failed:`, error)
    process.exit(1)
  })