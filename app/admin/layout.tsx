import { AdminNavBar } from "@/components/AdminNavBar";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { signOut } from "@/app/(main)/login/actions";

export default async function AdminLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const cookieStore = await cookies();
    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        { cookies: { getAll() { return cookieStore.getAll() } } }
    );

    const { data: { user } } = await supabase.auth.getUser();

    // Basic Auth Check (Detailed Role Check happens in Page or Middleware, but good to have here too)
    if (!user) {
        redirect("/login");
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
