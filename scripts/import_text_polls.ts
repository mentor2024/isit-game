
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { parse } from 'csv-parse/sync';

// Load env vars from .env.local
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase URL or Service Key.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importPolls() {
    const csvPath = path.join(process.cwd(), 'scripts', 'poll_feedback_data.csv');

    if (!fs.existsSync(csvPath)) {
        console.error(`CSV file not found at: ${csvPath}`);
        return;
    }

    console.log(`Reading CSV from: ${csvPath}`);
    const fileContent = fs.readFileSync(csvPath, 'utf-8');

    const records = parse(fileContent, {
        columns: true,
        skip_empty_lines: true
    }) as any[];

    console.log(`Found ${records.length} records to process.`);

    let updatedCount = 0;
    let errorCount = 0;

    for (const record of records) {
        const { id, feedback_correct, feedback_incorrect } = record;

        if (!id) {
            console.warn('Skipping record without ID:', record);
            continue;
        }

        // Only update if there is content to update
        if (!feedback_correct && !feedback_incorrect) {
            // console.log(`Skipping Poll ${id}: No feedback content.`);
            continue;
        }

        const updates: any = {};
        if (feedback_correct) updates.feedback_correct = feedback_correct;
        if (feedback_incorrect) updates.feedback_incorrect = feedback_incorrect;

        const { error } = await supabase
            .from('polls')
            .update(updates)
            .eq('id', id);

        if (error) {
            console.error(`Error updating Poll ${id}:`, error.message);
            errorCount++;
        } else {
            updatedCount++;
            if (updatedCount % 10 === 0) process.stdout.write('.');
        }
    }

    console.log('\nImport complete!');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Errors: ${errorCount}`);
}

importPolls();
