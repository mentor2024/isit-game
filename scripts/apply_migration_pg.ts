
import postgres from 'postgres';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const dbUrl = process.env.DATABASE_URL; // We need the connection string, typically in .env.local for Prisma/Drizzle etc. 
// If DATABASE_URL is not there, we might have to construct it from Supabase URL/Key which is not possible for direct SQL.
// Supabase usually provides a connection string in the dashboard.
// Let's check if we have DATABASE_URL in the env.

if (!dbUrl) {
    console.error('DATABASE_URL not found in .env.local. Checking for other vars...');
    // If we don't have it, we can't use 'postgres' driver directly.
    // We'd have to use the REST API via supabase-js but we can't create tables via REST API (usually).
    // EXCEPT if we have a SQL function exposed.

    // Let's look for a workaround. 
    process.exit(1);
}

const sql = postgres(dbUrl);

async function apply() {
    const migrationPath = path.resolve(__dirname, '../supabase/migrations/20260126_add_stage_config.sql');
    const migrationSql = fs.readFileSync(migrationPath, 'utf8');

    try {
        console.log("Applying migration...");
        await sql.unsafe(migrationSql);
        console.log("Migration applied successfully!");
    } catch (e) {
        console.error("Migration failed:", e);
    } finally {
        await sql.end();
    }
}

apply();
