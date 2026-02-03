import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function ThankYouPage() {
    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gray-50 text-center animate-in fade-in zoom-in duration-500">
            <div className="max-w-md w-full bg-white rounded-3xl shadow-xl overflow-hidden p-8 border border-gray-100">
                <div className="mb-6 flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                        <svg className="w-12 h-12 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                    </div>
                </div>

                <h1 className="text-3xl font-black mb-4">You're on the List!</h1>

                <p className="text-gray-600 mb-8 leading-relaxed">
                    Thank you for your interest. We received your details and will keep you updated on the progress of the ISIT Game and ISITAS training modules.
                </p>

                <p className="text-sm text-gray-500 italic mb-8">
                    Stay tuned for updates.
                </p>

                <Link
                    href="/"
                    className="block w-full py-4 text-lg font-bold text-white bg-black rounded-full hover:scale-105 transition-transform shadow-lg"
                >
                    Return Home
                </Link>
            </div>
        </div>
    );
}
