import { AdminNavBar } from "@/components/AdminNavBar";
import { redirect } from "next/navigation";
import { signOut } from "@/app/(main)/login/actions";
import { getServerSupabase } from "@/lib/supabaseServer";

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const supabase = await getServerSupabase();

    // 1. Authenticate User
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (!user || authError) {
        redirect("/login");
    }

    // 2. Authorize User (Role Check)
    const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    const role = profile?.role;
    const isAuthorized = role === 'admin' || role === 'superadmin';

    if (!isAuthorized) {
        // Redirect unauthorized users to home
        redirect("/");
    }

    // Double check role here to prevent layout leakage? 
    // Ideally, Middleware handles this, but for now we enforce role check in the Page or here.
    // Let's rely on Page Authorization for granularity, or add a quick check.

    return (
        <>
            <AdminNavBar signOutAction={signOut} />
            <div className="pt-20 bg-gray-50 min-h-screen">
                {children}
            </div>
        </>
    );
}
