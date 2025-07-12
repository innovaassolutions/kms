import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Load environment variables
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing required environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

interface MigrationRecord {
  id: number;
  filename: string;
  executed_at: string;
}

async function createMigrationTable() {
  // Use the postgres client directly for DDL operations
  const { error } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        filename TEXT UNIQUE NOT NULL,
        executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `
  });

  if (error) {
    console.error('Error creating migration table:', error);
    throw error;
  }
}

async function getMigrationHistory(): Promise<string[]> {
  const { data, error } = await supabase
    .from('schema_migrations')
    .select('filename')
    .order('id', { ascending: true });

  if (error) {
    console.error('Error fetching migration history:', error);
    throw error;
  }

  return data?.map(m => m.filename) || [];
}

async function runMigration(filename: string, sql: string) {
  console.log(`Running migration: ${filename}`);
  
  // Split SQL into individual statements
  const statements = sql
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0);

  for (const statement of statements) {
    try {
      const { error } = await supabase.rpc('exec_sql', {
        sql: statement + ';'
      });

      if (error) {
        console.error(`Error executing statement in ${filename}:`, error);
        console.error('Statement:', statement.substring(0, 100) + '...');
        throw error;
      }
    } catch (err) {
      console.error(`Failed to execute migration ${filename}`);
      throw err;
    }
  }

  // Record successful migration
  const { error: recordError } = await supabase
    .from('schema_migrations')
    .insert({ filename });

  if (recordError) {
    console.error('Error recording migration:', recordError);
    throw recordError;
  }

  console.log(`✓ Migration ${filename} completed successfully`);
}

async function runPendingMigrations() {
  const migrationsDir = path.join(__dirname, 'migrations');
  
  // Create migrations directory if it doesn't exist
  if (!fs.existsSync(migrationsDir)) {
    fs.mkdirSync(migrationsDir, { recursive: true });
    console.log('Created migrations directory');
  }

  // Get all SQL files in migrations directory
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(f => f.endsWith('.sql'))
    .sort();

  if (migrationFiles.length === 0) {
    console.log('No migration files found');
    return;
  }

  // Create migration tracking table if needed
  await createMigrationTable();

  // Get already executed migrations
  const executedMigrations = await getMigrationHistory();

  // Find pending migrations
  const pendingMigrations = migrationFiles.filter(
    f => !executedMigrations.includes(f)
  );

  if (pendingMigrations.length === 0) {
    console.log('All migrations are up to date');
    return;
  }

  console.log(`Found ${pendingMigrations.length} pending migrations`);

  // Run each pending migration
  for (const migration of pendingMigrations) {
    const filePath = path.join(migrationsDir, migration);
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    try {
      await runMigration(migration, sql);
    } catch (error) {
      console.error(`Migration ${migration} failed:`, error);
      process.exit(1);
    }
  }

  console.log('All migrations completed successfully');
}

// Execute migrations
runPendingMigrations()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Migration runner failed:', error);
    process.exit(1);
  });