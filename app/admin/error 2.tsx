'use client';

import { useEffect } from 'react';

export default function AdminError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Log the error to an error reporting service
        console.error("Admin Error Boundary Captured:", error);
    }, [error]);

    return (
        <div className="min-h-screen flex items-center justify-center p-8 bg-black">
            <div className="bg-red-500 text-white p-8 rounded-2xl max-w-2xl w-full font-mono text-sm overflow-auto shadow-[0_0_50px_rgba(220,38,38,0.5)]">
                <h1 className="text-2xl font-bold mb-4 font-sans flex items-center gap-2">
                    <span>🚨</span> Admin Crash Report
                </h1>
                <p className="mb-4 text-red-100 italic">Something went wrong in the dashboard.</p>

                <div className="bg-black/20 p-4 rounded-lg mb-4 overflow-x-auto">
                    <p className="font-bold text-lg mb-2">{error.message}</p>
                    {error.digest && <p className="text-xs opacity-50">Digest: {error.digest}</p>}
                </div>

                <pre className="mt-4 opacity-50 text-xs whitespace-pre-wrap leading-relaxed border-l-2 border-white/20 pl-4">
                    {error.stack}
                </pre>

                <button
                    onClick={() => reset()}
                    className="mt-8 bg-white text-red-600 px-6 py-3 rounded-xl font-bold hover:bg-red-50 transition-colors shadow-lg"
                >
                    Try to Recover
                </button>
            </div>
        </div>
    );
}
