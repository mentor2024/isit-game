-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. LEADS Table: Stores information about people or entities the agent interacts with
CREATE TABLE IF NOT EXISTS leads (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    name TEXT,
    source TEXT DEFAULT 'unknown', -- e.g. 'twitter', 'email', 'chat'
    status TEXT DEFAULT 'new', -- e.g. 'new', 'contacted', 'qualified', 'customer'
    metadata JSONB DEFAULT '{}'::jsonb, -- Flexible storage for extra info
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_contacted_at TIMESTAMPTZ
);

-- 2. MEMORIES Table: Stores the agent's interaction history with each lead
CREATE TABLE IF NOT EXISTS memories (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    lead_id UUID REFERENCES leads(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- e.g. 'chat', 'email', 'note', 'search_result'
    content TEXT NOT NULL, -- The actual memory/summary
    embedding VECTOR(1536), -- Optional: For future semantic search (pgvector) if enabled
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_leads_email ON leads(email);
CREATE INDEX IF NOT EXISTS idx_memories_lead_id ON memories(lead_id);
