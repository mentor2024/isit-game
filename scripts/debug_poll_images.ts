
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase environment variables.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkPoll() {
    const pollId = '6195e740-f771-417f-8203-977ffa74efd9';
    console.log(`Checking poll: ${pollId}`);

    const { data: poll, error } = await supabase
        .from('polls')
        .select('*, poll_objects(*)')
        .eq('id', pollId)
        .single();

    if (error) {
        console.error('Error fetching poll:', error);
        return;
    }

    console.log('Poll:', poll.title, `Type: ${poll.type}`);
    console.log('Objects:', JSON.stringify(poll.poll_objects, null, 2));
}

checkPoll();
