import NavBar from "@/components/NavBar";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function getUserAndRole() {
    const cookieStore = await cookies();

    // 1. Validate Session
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() { return cookieStore.getAll() },
                setAll(cookiesToSet) { try { cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options)) } catch { } },
            },
        }
    );

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, role: null };

    // 2. Fetch Role (Securely)
    const serviceClient = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        { cookies: { getAll() { return [] }, setAll() { } } }
    );

    const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role, score, current_stage')
        .eq('id', user.id)
        .single();

    return { user, role: profile?.role, score: profile?.score || 0, currentStage: profile?.current_stage ?? 0 };
}

import { signOut } from "./login/actions";

export default async function MainLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    let user = null;
    let role = null;
    let score = 0;
    let currentStage = 0; // Default to 0 (Stage Zero/Anon)

    try {
        const data = await getUserAndRole();
        user = data.user;
        role = data.role;
        score = data.score;
        currentStage = data.currentStage;
    } catch (error) {
        console.error("Error in MainLayout:", error);
    }

    return (
        <>
            <NavBar user={user} role={role} score={score} currentStage={currentStage} signOutAction={signOut} />
            <div className="pt-20">
                {children}
            </div>
        </>
    );
}
