export const dynamic = 'force-dynamic';

import Link from "next/link";
import Image from "next/image";

export default function WelcomePage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white p-6 text-center">

            <div className="max-w-xl w-full flex flex-col items-center gap-8 animate-in fade-in zoom-in duration-500">
                <Image
                    src="/logo.png"
                    alt="IS IT? Game Logo"
                    width={200}
                    height={80}
                    className="h-20 w-auto object-contain"
                    priority
                />

                <div className="space-y-4">
                    <h1 className="text-5xl font-black tracking-tighter">Welcome to the Game</h1>
                    <p className="text-xl text-gray-600 leading-relaxed">
                        We need your help to settle the world's most important debates.
                        <br />
                        Is a hotdog a sandwich? Is cereal soup?
                    </p>
                </div>

                <div className="p-6 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-300 w-full">
                    <h3 className="font-bold text-gray-400 uppercase tracking-widest text-xs mb-2">How it works</h3>
                    <ul className="text-left space-y-3 font-medium text-gray-700 mx-auto max-w-xs">
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">1</span>
                            Review the Objects
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">2</span>
                            Drag them to their correct side
                        </li>
                        <li className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center text-xs font-bold">3</span>
                            Unlock the next debate
                        </li>
                    </ul>
                </div>

                <Link
                    href="/poll"
                    className="w-full bg-black text-white text-xl font-bold py-4 rounded-full hover:scale-105 transition-transform shadow-xl"
                >
                    Let's Play
                </Link>
            </div>

        </div>
    );
}
