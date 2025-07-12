#!/usr/bin/env npx tsx

import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'fs'
import { join } from 'path'

// Load environment variables from .env.local
const envPath = join(process.cwd(), '.env.local')
try {
  const envFile = readFileSync(envPath, 'utf8')
  const envVars = envFile.split('\n').filter(line => line.trim() && !line.startsWith('#'))
  
  envVars.forEach(line => {
    const [key, ...valueParts] = line.split('=')
    if (key && valueParts.length > 0) {
      const value = valueParts.join('=').trim()
      process.env[key.trim()] = value
    }
  })
} catch (error) {
  console.error('Could not load .env.local file:', error)
}

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables:')
  console.error('- NEXT_PUBLIC_SUPABASE_URL')
  console.error('- SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function cleanupKMSData() {
  console.log('🗑️  Starting KMS data cleanup...')
  
  try {
    // Step 1: Get all documents to find their file paths
    console.log('📋 Fetching all documents...')
    const { data: documents, error: fetchError } = await supabase
      .from('documents')
      .select('id, file_path, title')
    
    if (fetchError) {
      console.error('❌ Error fetching documents:', fetchError)
      return
    }
    
    console.log(`📄 Found ${documents?.length || 0} documents`)
    
    // Step 2: Delete files from storage bucket
    if (documents && documents.length > 0) {
      console.log('🗂️  Deleting files from storage bucket...')
      
      const filePaths = documents
        .filter(doc => doc.file_path)
        .map(doc => doc.file_path!)
      
      if (filePaths.length > 0) {
        const { error: storageError } = await supabase.storage
          .from('documents')
          .remove(filePaths)
        
        if (storageError) {
          console.error('❌ Error deleting files from storage:', storageError)
          // Continue anyway to clean up database
        } else {
          console.log(`✅ Deleted ${filePaths.length} files from storage`)
        }
      }
    }
    
    // Step 3: Delete all documents from database
    console.log('🗃️  Deleting all documents from database...')
    const { error: deleteError } = await supabase
      .from('documents')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000') // Delete all (using impossible condition)
    
    if (deleteError) {
      console.error('❌ Error deleting documents from database:', deleteError)
      return
    }
    
    console.log('✅ All documents deleted from database')
    
    // Step 4: Verify cleanup
    console.log('🔍 Verifying cleanup...')
    const { data: remainingDocs, error: verifyError } = await supabase
      .from('documents')
      .select('id')
    
    if (verifyError) {
      console.error('❌ Error verifying cleanup:', verifyError)
      return
    }
    
    if (remainingDocs && remainingDocs.length === 0) {
      console.log('✅ Cleanup completed successfully!')
      console.log('🎉 KMS is now ready for your actual data')
    } else {
      console.log(`⚠️  Warning: ${remainingDocs?.length || 0} documents still remain`)
    }
    
  } catch (error) {
    console.error('❌ Unexpected error during cleanup:', error)
    process.exit(1)
  }
}

// Add confirmation prompt
function askForConfirmation(): Promise<boolean> {
  return new Promise((resolve) => {
    const readline = require('readline')
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    })
    
    rl.question('⚠️  This will DELETE ALL documents and files. Are you sure? (y/N): ', (answer: string) => {
      rl.close()
      resolve(answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes')
    })
  })
}

// Main execution
async function main() {
  console.log('🚨 KMS Data Cleanup Tool')
  console.log('This will delete ALL documents from the database and storage bucket.')
  console.log('')
  
  const confirmed = await askForConfirmation()
  
  if (!confirmed) {
    console.log('❌ Cleanup cancelled')
    process.exit(0)
  }
  
  await cleanupKMSData()
}

main().catch(console.error)