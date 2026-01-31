import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function main() {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

    // Get Stage 0 polls
    const { data: polls } = await s
        .from('polls')
        .select('id, title, type, poll_objects(id, text, points)')
        .eq('stage', 0);

    console.log(`--- STAGE 0 POLLS (${polls?.length}) ---`);
    polls?.forEach(p => {
        console.log(`Poll: ${p.title} [${p.type}]`);
        p.poll_objects.forEach((o: any) => {
            console.log(`   - [${o.points ?? 'NULL'}] ${o.text.substring(0, 40)}...`);
        });
        console.log('---');
    });
}
main();
