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
    currentStage = 0,
    signOutAction,
}: {
    user: User | null;
    role: string | null;
    score?: number;
    currentStage?: number;
    signOutAction: () => Promise<void>;
}) {
    const pathname = usePathname();

    return (
        <nav className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 transition-all duration-300
            ${pathname === '/'
                ? 'bg-transparent border-transparent py-6'
                : 'bg-[url(/nav_bg.jpg)] bg-cover bg-center border-b border-gray-200 py-4 shadow-md'}
        `}>
            {/* Left Spacer (for centering) */}
            <div className="flex-1 hidden md:block" />

            {/* Branding - Centered */}
            <div className="flex-shrink-0">
                <Link href="/" className="block hover:scale-105 transition-transform">
                    <Image
                        src="/isit_logo_full.png"
                        alt="The ISIT Game"
                        width={300}
                        height={100}
                        className={`${pathname === '/' ? 'h-24' : 'h-12'} w-auto object-contain transition-all duration-300`}
                        priority
                    />
                </Link>
            </div>

            {/* Navigation Links - Right Aligned */}
            <div className="flex items-center gap-4 flex-1 justify-end">
                {/* Score: Only show if User AND Stage > 0 */}
                {user && currentStage > 0 && (
                    <div className="flex items-center gap-1.5 bg-yellow-50 px-3 py-1.5 rounded-full border border-yellow-200 text-yellow-800 font-bold text-sm mr-2">
                        <Star size={14} className="fill-yellow-500 text-yellow-500" />
                        <span>{score}</span>
                    </div>
                )}

                {/* Polls Link: Only show if Stage > 0 */}
                {currentStage > 0 && (
                    <Link
                        href="/"
                        className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname === '/'
                            ? 'bg-black text-white'
                            : 'hover:bg-gray-100'
                            }`}
                    >
                        Polls
                    </Link>
                )}

                {/* User Actions */}
                {user ? (
                    <div className="flex items-center gap-3 pl-2">
                        {role === 'admin' || role === 'superadmin' ? (
                            <Link href="/admin" className="text-sm font-bold hover:underline">
                                Admin
                            </Link>
                        ) : null}

                        {!user.is_anonymous && (
                            <span className="text-sm font-bold truncate max-w-[100px] hidden sm:inline-block text-gray-600">
                                {user.email?.split('@')[0]}
                            </span>
                        )}

                        <form action={signOutAction}>
                            <button className="text-sm font-bold hover:text-gray-600 transition-colors">
                                Log Out
                            </button>
                        </form>
                    </div>
                ) : (
                    <Link href="/login" className="text-sm font-bold hover:underline">
                        Log In
                    </Link>
                )}
            </div>
        </nav>
    );
}
