
import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkUsersSchema() {
    console.log("Checking 'users' table structure...");

    // Fetch one user to see columns
    const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

    if (error) {
        console.error("Error fetching users:", error);
    } else if (data && data.length > 0) {
        console.log("User record found:");
        console.log(Object.keys(data[0])); // Log keys
        console.log("Sample User Role Info:", {
            id: data[0].id,
            role: data[0].role,
            is_admin: data[0].is_admin
        });
    } else {
        console.log("No users found in public.users table.");
    }
}

checkUsersSchema();
