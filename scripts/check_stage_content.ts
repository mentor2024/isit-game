
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function checkStage() {
    const { data: polls } = await supabase
        .from('polls')
        .select('title')
        .eq('stage', 2)
        .eq('level', 1);

    console.log('Polls in Stage 2, Level 1:');
    polls?.forEach(p => console.log(`- ${p.title}`));
}
checkStage();
