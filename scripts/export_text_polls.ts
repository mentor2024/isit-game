
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function exportPolls() {
    console.log('Fetching isit_text polls...');

    // Fetch ALL polls
    const { data: polls, error } = await supabase
        .from('polls')
        .select(`
            id,
            title,
            stage,
            level,
            poll_order,
            poll_objects (
                text
            )
        `)
        .eq('stage', 2)
        .eq('level', 2)
        .order('poll_order');

    if (error) {
        console.error('Error fetching polls:', error);
        return;
    }

    if (!polls || polls.length === 0) {
        console.log('No polls found.');
        return;
    }

    console.log(`Found ${polls.length} polls.`);

    // Helper to escape CSV fields
    const escapeCsv = (str: string) => {
        if (!str) return '';
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
            return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
    };

    // CSV Header
    const headers = ['id', 'title', 'feedback_correct', 'feedback_incorrect'];
    const rows = polls.map(p => {
        return [
            escapeCsv(p.id),
            escapeCsv(p.title),
            '', // Empty feedback_correct
            ''  // Empty feedback_incorrect
        ].join(',');
    });

    const csvContent = headers.join(',') + '\n' + rows.join('\n');
    const outputPath = path.join(process.cwd(), 'public', 'poll_feedback_template.csv');

    fs.writeFileSync(outputPath, csvContent);
    console.log(`CSV exported to: ${outputPath}`);
}

exportPolls();
