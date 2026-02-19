"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";

export function AdminNavBar({ signOutAction }: { signOutAction: () => Promise<void> }) {
    const pathname = usePathname();

    return (
        <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-black/90 backdrop-blur text-white">
            {/* Branding */}
            <div className="flex items-center gap-4">
                <Link href="/admin" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
                    <Image
                        src="/images/isit-logo-full.png"
                        alt="The ISIT Game"
                        width={140}
                        height={40}
                        className="object-contain h-10 w-auto"
                    />
                    <span className="font-black text-3xl tracking-tighter text-white mt-1">ADMIN</span>
                </Link>
            </div>

            {/* Navigation Links */}
            <div className="flex items-center gap-2 bg-white/10 p-1 rounded-full border border-white/20">

                <Link
                    href="/admin/users"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.startsWith('/admin/users')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Users
                </Link>

                <Link
                    href="/admin/polls"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.startsWith('/admin/polls')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Polls
                </Link>

                <Link
                    href="/admin/levels"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.startsWith('/admin/levels')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Levels
                </Link>

                <Link
                    href="/admin/stages"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.startsWith('/admin/stages')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Stages
                </Link>

                <Link
                    href="/admin/feedback"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.startsWith('/admin/feedback')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Feedback
                </Link>

                <Link
                    href="/admin/documentation"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.includes('/admin/documentation')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Docs
                </Link>

                <Link
                    href="/admin/leads"
                    className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all ${pathname.startsWith('/admin/leads')
                        ? 'bg-white text-black'
                        : 'hover:bg-white/10'
                        }`}
                >
                    Leads
                </Link>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                <Link
                    href="/poll"
                    className="px-4 py-1.5 rounded-full bg-white text-black text-xs font-bold hover:scale-105 transition-transform"
                >
                    Exit to App
                </Link>
                <form action={signOutAction}>
                    <button className="text-xs font-bold hover:underline text-red-400 hover:text-red-300">
                        Log Out
                    </button>
                </form>
            </div>
        </nav>
    );
}
