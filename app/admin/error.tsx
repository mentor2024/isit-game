'use client'

import { useEffect } from 'react'

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error(error)
    }, [error])

    return (
        <div className="flex flex-col items-center justify-center p-24">
            <h2 className="text-2xl font-bold mb-4">Something went wrong!</h2>
            <p className="mb-4 text-red-600 font-mono text-sm bg-red-50 p-2 rounded max-w-lg overflow-auto">
                {error.message}
            </p>
            <button
                onClick={
                    // Attempt to recover by trying to re-render the segment
                    () => reset()
                }
                className="bg-black text-white px-6 py-3 rounded-xl font-bold hover:scale-105 transition-transform"
            >
                Try again
            </button>
        </div>
    )
}
