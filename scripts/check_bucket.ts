
import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
import path from 'path';

// Load env vars
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function checkBucket() {
    console.log("Checking buckets...");
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const { data: buckets, error } = await supabase.storage.listBuckets();

    if (error) {
        console.error("Error listing buckets:", error);
        return;
    }

    console.log("Identified Buckets:");
    buckets.forEach(b => {
        console.log(`- ID: ${b.id}, Name: ${b.name}, Public: ${b.public}`);
    });

    const fbBucket = buckets.find(b => b.id === 'feedback_attachments');
    if (fbBucket) {
        console.log("\n✅ 'feedback_attachments' bucket FOUND.");
        console.log(`   Public: ${fbBucket.public}`);
    } else {
        console.error("\n❌ 'feedback_attachments' bucket NOT FOUND.");
    }
}

checkBucket();
