"use client";

import Link from "next/link";
import { User } from "@supabase/supabase-js";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { Star } from "lucide-react";
export default function NavBar({
    user,
    role,
    score = 0,
    signOutAction,
}: {
    user: User | null;
    role: string | null;
    score?: number;
    signOutAction: () => Promise<void>;
}) {
    const pathname = usePathname();

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 border-b transition-all duration-300
            ${pathname === '/' ? 'bg-transparent border-transparent' : 'bg-white border-gray-200'}
        `}>
            {/* Branding */}
            <div>
                <Link href="/" className="block hover:scale-105 transition-transform">
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
            <div className="flex items-center gap-4">
                {user && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 text-yellow-800 font-bold text-sm mr-2">
                        <Star size={14} className="fill-yellow-500 text-yellow-500" />
                        <span>{score}</span>
                    </div>
                )}

                <Link
                    href="/"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname === '/'
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-100'
                        }`}
                >
                    Polls
                </Link>

                <div className="w-[1px] h-6 bg-gray-200 mx-1"></div>

                {/* User Actions */}
                {user ? (
                    <div className="flex items-center gap-3 pl-2">
                        <span className="text-xs font-bold truncate max-w-[100px] hidden sm:inline-block text-gray-600">
                            {user.email}
                        </span>

                        {(role === "admin" || role === "superadmin") && (
                            <>
                                <span className="text-gray-300 text-xs">|</span>
                                <Link
                                    href="/admin"
                                    className="text-sm font-bold hover:underline text-gray-900"
                                >
                                    Admin
                                </Link>
                            </>
                        )}

                        <form action={signOutAction}>
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
