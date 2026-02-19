import Link from "next/link";
import { Book, Variable, FileText } from "lucide-react";

export default function DocumentationPage() {
    return (
        <div className="p-8 max-w-5xl mx-auto">
            <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
                <Book className="w-8 h-8" />
                Documentation
            </h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Variables Card */}
                <Link
                    href="/admin/documentation/variables"
                    className="group block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-black transition-all"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-blue-50 rounded-lg group-hover:bg-blue-100 transition-colors">
                            <Variable className="w-6 h-6 text-blue-600" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold mb-2 group-hover:text-blue-600 transition-colors">Variables</h2>
                    <p className="text-gray-600">
                        Reference for dynamic variables (e.g., [[AQ]], [[DQ]]) used in messages and instructions.
                    </p>
                </Link>

                {/* Vocabulary Card */}
                <Link
                    href="/admin/documentation/vocabulary"
                    className="group block p-6 bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md hover:border-black transition-all"
                >
                    <div className="flex items-start justify-between mb-4">
                        <div className="p-3 bg-green-50 rounded-lg group-hover:bg-green-100 transition-colors">
                            <FileText className="w-6 h-6 text-green-600" />
                        </div>
                    </div>
                    <h2 className="text-xl font-bold mb-2 group-hover:text-green-600 transition-colors">Vocabulary</h2>
                    <p className="text-gray-600">
                        Definitions of key terms and metrics like Awareness Quotient (AQ) and Deviance Quotient (DQ).
                    </p>
                </Link>
            </div>
        </div>
    );
}
