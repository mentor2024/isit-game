"use client";

import { ArrowLeft, Copy, Check } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

function CopyButton({ text, className = "" }: { text: string, className?: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
    };

    return (
        <button
            onClick={handleCopy}
            className={`group flex items-center gap-2 hover:bg-gray-100 px-3 py-1.5 rounded-lg transition-all ${className}`}
            title="Click to copy"
        >
            <span className="font-mono font-bold text-blue-600">{text}</span>
            <span className="text-gray-300 group-hover:text-black transition-colors">
                {copied ? <Check size={14} className="text-green-500" /> : <Copy size={14} />}
            </span>
        </button>
    );
}

export default function VariablesDocumentationPage() {
    return (
        <div className="max-w-4xl mx-auto p-8">
            <Link href="/admin" className="inline-flex items-center gap-2 text-gray-500 hover:text-black mb-8 transition-colors font-bold">
                <ArrowLeft size={20} />
                Back to Dashboard
            </Link>

            <h1 className="text-4xl font-black mb-2">Message Variables Guide</h1>
            <p className="text-xl text-gray-500 mb-12">
                Use these dynamic placeholders in your Poll Instructions, Correct/Incorrect Feedback, and Level Completion messages to personalize the user experience.
            </p>

            <div className="space-y-12">
                {/* SECTION 1: USER METRICS */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-yellow-400 p-2 rounded-lg">
                            <span className="text-2xl font-black">1</span>
                        </div>
                        <h2 className="text-2xl font-black">User Metrics</h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Variable (Click to Copy)</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Example Output</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[DQ]]" />
                                    </td>
                                    <td className="px-6 py-4">Overall Deviance Quotient (Current)</td>
                                    <td className="px-6 py-4 text-gray-600">"Your DQ is 0.15"</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[AQ]]" />
                                    </td>
                                    <td className="px-6 py-4">Overall Awareness Quotient</td>
                                    <td className="px-6 py-4 text-gray-600">"AQ Level: 1250"</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[PointTotal]]" />
                                    </td>
                                    <td className="px-6 py-4">Total Points Accumulated</td>
                                    <td className="px-6 py-4 text-gray-600">"You have 450 points"</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECTION 2: CONTEXTUAL METRICS */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-blue-400 p-2 rounded-lg text-white">
                            <span className="text-2xl font-black">2</span>
                        </div>
                        <h2 className="text-2xl font-black">Contextual Metrics (Last Action)</h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 bg-blue-50/50 border-b border-blue-100 text-sm text-blue-800">
                            <strong>Note:</strong> These variables depend on context. In a <em>Level Complete</em> screen, they refer to the Level just finished. In <em>Poll Instructions</em>, they refer to the <em>previous</em> poll voted on.
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Variable (Click to Copy)</th>
                                    <th className="px-6 py-4">Description</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[LastDQ]]" />
                                    </td>
                                    <td className="px-6 py-4">The DQ calculated for the specific scope (Level or Single Poll).</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[LastScore]]" />
                                    </td>
                                    <td className="px-6 py-4">Points earned in that specific scope.</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECTION 3: CONTEXTUAL RANDOM PICKS */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-green-400 p-2 rounded-lg text-white">
                            <span className="text-2xl font-black">3</span>
                        </div>
                        <h2 className="text-2xl font-black">Contextual Random Picks (Level Specific)</h2>
                    </div>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <div className="p-6 bg-green-50/50 border-b border-green-100 text-sm text-green-800">
                            <strong>Note:</strong> These variables work best in <em>Level Completion</em> messages. They pick a random example from the user's actual performance in the current level to make feedback feel personal.
                        </div>
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Variable (Click to Copy)</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4">Example Output</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[RandomCorrectPick]]" />
                                    </td>
                                    <td className="px-6 py-4">A user's correct choice text.</td>
                                    <td className="px-6 py-4 text-gray-600">"craft table"</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[RandomIncorrectPick]]" />
                                    </td>
                                    <td className="px-6 py-4">A user's incorrect choice text.</td>
                                    <td className="px-6 py-4 text-gray-600">"assembly line"</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[RandomCorrectPoll]]" />
                                    </td>
                                    <td className="px-6 py-4">Title of a poll they got right.</td>
                                    <td className="px-6 py-4 text-gray-600">"assembly line | craft table"</td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[RandomIncorrectPoll]]" />
                                    </td>
                                    <td className="px-6 py-4">Title of a poll they got wrong.</td>
                                    <td className="px-6 py-4 text-gray-600">"clock | hourglass"</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* SECTION 4: DYNAMIC HISTORY */}
                <section>
                    <div className="flex items-center gap-4 mb-6">
                        <div className="bg-purple-400 p-2 rounded-lg text-white">
                            <span className="text-2xl font-black">4</span>
                        </div>
                        <h2 className="text-2xl font-black">Dynamic History (Call-Backs)</h2>
                    </div>

                    <p className="mb-6 text-gray-600">
                        Reference specific past events using the format <code>[[Type-S#-L#-P#]]</code>.
                        <br />
                        <span className="text-sm bg-gray-100 px-2 py-1 rounded inline-block mt-2 font-mono">
                            S = Stage, L = Level, P = Poll Order
                        </span>
                    </p>

                    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-left">
                            <thead className="bg-gray-50 text-xs uppercase text-gray-400 font-bold tracking-wider">
                                <tr>
                                    <th className="px-6 py-4">Format (Click to Copy Template)</th>
                                    <th className="px-6 py-4">Output</th>
                                    <th className="px-6 py-4">Logic Details</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[Q-S#-L#-P#]]" className="text-purple-600" />
                                    </td>
                                    <td className="px-6 py-4">Poll Question / Title</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        <strong>Stage 0:</strong> Returns the "Question" Field (Instructions).
                                        <br />
                                        <strong>Stage 1+:</strong> Returns the "Title" Field.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[A-S#-L#-P#]]" className="text-purple-600" />
                                    </td>
                                    <td className="px-6 py-4">User's Answer</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        Returns the text of the option the user selected.
                                        <br />If no vote found: <em>"[Not Answered]"</em>.
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[P-S#-L#-P#]]" className="text-purple-600" />
                                    </td>
                                    <td className="px-6 py-4">Points Earned</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        Returns the numeric points earned for that specific poll (e.g. "10", "5", "0").
                                    </td>
                                </tr>
                                <tr>
                                    <td className="px-6 py-4">
                                        <CopyButton text="[[F-S#-L#-P#]]" className="text-purple-600" />
                                    </td>
                                    <td className="px-6 py-4">Feedback Message</td>
                                    <td className="px-6 py-4 text-sm text-gray-500">
                                        Returns the dynamic feedback text associated with the specific answer the user chose.
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <div className="mt-6 p-6 bg-gray-100 rounded-xl">
                        <h4 className="font-bold text-gray-700 mb-2 uppercase text-xs tracking-wider">Example Usage</h4>
                        <p className="font-mono text-sm text-gray-800 bg-white p-4 rounded-lg border border-gray-300 shadow-inner">
                            "Remember in Stage 1 when we asked <strong>[[Q-S1-L1-P1]]</strong>? You chose <strong>[[A-S1-L1-P1]]</strong> and earned <strong>[[P-S1-L1-P1]]</strong> points."
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
