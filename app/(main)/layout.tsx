import NavBar from "@/components/NavBar";
import { getServerSupabase, getServiceRoleClient } from "@/lib/supabaseServer";

async function getUserAndRole() {
    // 1. Validate Session
    const supabase = await getServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { user: null, role: null };

    // 2. Fetch Role (Securely)
    const serviceClient = getServiceRoleClient();

    const { data: profile } = await serviceClient
        .from('user_profiles')
        .select('role, score, current_stage')
        .eq('id', user.id)
        .single();

    return { user, role: profile?.role, score: profile?.score || 0, currentStage: profile?.current_stage ?? 0 };
}

import Footer from "@/components/Footer";
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
        <div className="min-h-screen flex flex-col">
            <NavBar user={user} role={role} score={score} currentStage={currentStage} signOutAction={signOut} />
            <div className="pt-20 flex-grow">
                {children}
            </div>
            <Footer />
        </div>
    );
}
