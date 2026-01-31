import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

async function check() {
    const s = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
    const { data } = await s.from('polls').select('id, title, type').eq('id', 'e3c3ad46-88e7-4d0d-8902-9ce1294c4e8c').single();
    console.log(data);
}
check();
