export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";

export default function WelcomePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">

            <div className="max-w-xl w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                <h1 className="text-5xl font-black tracking-tighter">Welcome to</h1>

                <Image
                    src="/logo.png"
                    alt="IS IT? Game Logo"
                    width={200}
                    height={80}
                    className="h-20 w-auto object-contain"
                    priority
                />

                <div className="space-y-4">
                    <p className="text-xl text-gray-600 leading-relaxed">
                        Welcome to the ISIT Game—an experiment in collaborative sensemaking based on the <a href="https://isitas.org/the-isit-construct/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">ISIT Construct</a> that will allow humanity to achieve the critical goal of AI Alignment by raising our own collective Awareness.
                    </p>
                </div>

                <Link
                    href="/poll"
                    className="w-full text-white text-xl font-bold py-4 rounded-full hover:scale-105 transition-transform shadow-xl"
                    style={{ backgroundColor: '#af0111' }}
                >
                    Let's Play
                </Link>
            </div>

        </div>
    );
}
