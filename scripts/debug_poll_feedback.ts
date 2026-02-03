
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkPoll() {
    const { data: polls } = await supabase
        .from('polls')
        .select('*')
        .ilike('title', '%positive%');

    console.log('Polls found:', polls?.length);
    polls?.forEach(p => {
        console.log(`\nID: ${p.id}`);
        console.log(`Title: ${p.title}`);
        console.log(`Feedback Incorrect (DB): ${p.feedback_incorrect}`);
    });
}
checkPoll();
