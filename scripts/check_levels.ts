
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function checkLevels() {
    // Check Stage 1 Level 1 Count
    const { count: s1l1 } = await supabase.from('polls').select('id', { count: 'exact', head: true }).eq('stage', 1).eq('level', 1);

    // Check Stage 1 Level 2 Count
    const { count: s1l2 } = await supabase.from('polls').select('id', { count: 'exact', head: true }).eq('stage', 1).eq('level', 2);

    // Check Stage 2 Level 1 Count
    const { count: s2l1 } = await supabase.from('polls').select('id', { count: 'exact', head: true }).eq('stage', 2).eq('level', 1);

    console.log(`Stage 1 Level 1 Polls: ${s1l1}`);
    console.log(`Stage 1 Level 2 Polls: ${s1l2}`);
    console.log(`Stage 2 Level 1 Polls: ${s2l1}`);

    // Check Config for S1 L1
    const { data: config } = await supabase.from('level_configurations').select('*').eq('stage', 1).eq('level', 1).maybeSingle();
    console.log('S1 L1 Config:', config);
}

checkLevels();
