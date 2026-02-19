"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, ListFilter, Layers, ArrowLeft } from "lucide-react";

export function AdminNavBar() {
    const pathname = usePathname();

    const links = [
        { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
        { href: "/admin/polls", label: "Polls", icon: ListFilter },
        { href: "/admin/levels", label: "Levels", icon: Layers },
        { href: "/admin/users", label: "Users", icon: Users },
    ];

    return (
        <nav className="bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 z-50">
            <div className="flex items-center gap-8">
                <Link href="/" className="font-black text-xl tracking-tight hover:scale-105 transition-transform flex items-center gap-2">
                    <ArrowLeft className="w-5 h-5" />
                    ISIT
                </Link>

                <div className="h-6 w-px bg-gray-200 mx-2" />

                <div className="flex items-center gap-2">
                    {links.map(link => {
                        const Icon = link.icon;
                        const isActive = pathname === link.href || (link.href !== "/admin" && pathname.startsWith(link.href));
                        return (
                            <Link
                                key={link.href}
                                href={link.href}
                                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-bold transition-all ${isActive
                                        ? "bg-black text-white shadow-md transform scale-105"
                                        : "text-gray-500 hover:text-black hover:bg-gray-100"
                                    }`}
                            >
                                <Icon className="w-4 h-4" />
                                {link.label}
                            </Link>
                        );
                    })}
                </div>
            </div>

            <div className="flex items-center gap-4">
                <div className="text-xs font-mono bg-gray-100 px-2 py-1 rounded text-gray-500">
                    Admin Mode
                </div>
            </div>
        </nav>
    );
}
