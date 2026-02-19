'use client';

import { useEffect } from 'react';

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Game Error Boundary Captured:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8 bg-gray-50 text-center">
            <h1 className="text-6xl mb-4">😵‍💫</h1>
            <h2 className="text-3xl font-black mb-4">Whoops!</h2>
            <p className="text-gray-500 mb-8 max-w-md">
                We tripped over a digital wire. <br />
                The game logic got confused.
            </p>

            <button
                onClick={() => reset()}
                className="bg-black text-white px-8 py-4 rounded-full font-bold hover:scale-105 transition-transform shadow-xl"
            >
                Try Again
            </button>

            {/* Hidden technical details for debug */}
            <div className="mt-12 p-4 bg-gray-100 rounded text-xs text-gray-400 font-mono text-left max-w-lg hidden md:block">
                <p>{error.message}</p>
            </div>
        </div>
    );
}
