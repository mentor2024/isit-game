"use client";

import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { signOut } from "@/app/login/actions";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function NavBar({
    user,
    role,
}: {
    user: User | null;
    role: string | null;
}) {
    const pathname = usePathname();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 pointer-events-none">
            {/* Branding */}
            <div className="pointer-events-auto">
                <Link href="/poll" className="block hover:scale-105 transition-transform">
                    <Image
                        src="/logo.png"
                        alt="IS IT? Game Logo"
                        width={120}
                        height={40}
                        className="h-10 w-auto object-contain"
                        priority
                    />
                </Link>
            </div>

            {/* Navigation Links */}
            <div className="pointer-events-auto flex items-center gap-4 bg-white/90 backdrop-blur-sm p-2 rounded-full border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">

                <Link
                    href="/poll"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname === '/poll'
                            ? 'bg-black text-white'
                            : 'hover:bg-gray-100'
                        }`}
                >
                    Polls
                </Link>

                {(role === "admin" || role === "superadmin") && (
                    <Link
                        href="/admin"
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname === '/admin'
                                ? 'bg-black text-white'
                                : 'hover:bg-gray-100'
                            }`}
                    >
                        Admin
                    </Link>
                )}

                <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

                {/* User Actions */}
                {user ? (
                    <div className="flex items-center gap-3 pl-2">
                        <span className="text-xs font-bold truncate max-w-[100px] hidden sm:inline-block text-gray-600">
                            {user.email}
                        </span>
                        <form action={signOut}>
                            <button className="text-sm font-bold hover:underline text-red-600">
                                Log Out
                            </button>
                        </form>
                    </div>
                ) : (
                    <Link
                        href="/login"
                        className="px-4 py-1.5 rounded-full bg-black text-white text-sm font-bold hover:scale-105 transition-transform"
                    >
                        Log In
                    </Link>
                )}
            </div>
        </nav>
    );
}
