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

    revalidatePath("/", "layout");
    redirect("/poll");
}

export async function signOut() {
    const supabase = await createSupabaseServerClient();
    await supabase.auth.signOut();
    revalidatePath("/", "layout");
    redirect("/login");
}
