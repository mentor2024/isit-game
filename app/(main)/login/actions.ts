"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

async function createSupabaseServerClient() {
    const cookieStore = await cookies();

    return createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options)
                        );
                    } catch {
                        // 
                    }
                },
            },
        }
    );
}


export async function login(formData: FormData) {
    const supabase = await createSupabaseServerClient();

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };

    const { error } = await supabase.auth.signInWithPassword(data);

    if (error) {
        console.error("Login error:", error);
        redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    revalidatePath("/", "layout");

    // Check if user has voted on anything
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
        // 1. Check Role - Use Service Role to bypass RLS recursion
        const serviceClient = createServerClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!,
            { cookies: { getAll() { return [] }, setAll() { } } }
        );

        const { data: profile } = await serviceClient
            .from('user_profiles')
            .select('role')
            .eq('id', user.id)
            .single();

        console.log("Login Debug - Role:", profile?.role);

        const role = profile?.role;
        if (role === 'admin' || role === 'superadmin') {
            redirect("/admin");
        }

        // 2. Check Votes (for standard users)
        const { count } = await supabase
            .from('poll_votes')
            .select('*', { count: 'exact', head: true })
            .eq('user_id', user.id);

        if (count === 0) {
            redirect("/welcome");
        }
    }

    redirect("/poll");
}

export async function signup(formData: FormData) {
    const supabase = await createSupabaseServerClient();

    const data = {
        email: formData.get("email") as string,
        password: formData.get("password") as string,
    };
    const { error } = await supabase.auth.signUp(data);

    if (error) {
        console.error("Signup error:", error);
        redirect(`/login?error=${encodeURIComponent(error.message)}`);
    }

    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        redirect("/login?message=Account created! Please check your email to confirm your account.");
    }

    // New User -> Welcome
    revalidatePath("/", "layout");
    redirect("/welcome");
}

export async function signOut() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}
