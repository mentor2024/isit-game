"use client";

import Link from "next/link";
import { ArrowLeft, BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { useState, ReactNode } from "react";

interface VocabularyCardProps {
    title: string;
    badgeText: string;
    badgeColor: string; // e.g. "bg-yellow-100 text-yellow-800"
    summary: string;
    children?: ReactNode; // The expanded content
    expandedContent?: ReactNode;
}

function VocabularyCard({ title, badgeText, badgeColor, summary, expandedContent }: VocabularyCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const hasDetails = !!expandedContent;

    return (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm transition-all">
            <div
                className={`flex items-start justify-between ${hasDetails ? 'cursor-pointer' : ''}`}
                onClick={() => hasDetails && setIsExpanded(!isExpanded)}
            >
                <div className="flex-1">
                    <div className="flex items-baseline gap-3 mb-2">
                        <h2 className="text-xl font-bold text-gray-900">{title}</h2>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase ${badgeColor}`}>
                            {badgeText}
                        </span>
                    </div>
                </div>
                {hasDetails && (
                    <button className="text-gray-400 hover:text-black mt-1 ml-4">
                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                    </button>
                )}
            </div>

            <p className="text-gray-700 leading-relaxed font-medium">
                {summary}
            </p>

            {isExpanded && expandedContent && (
                <div className="mt-4 pt-4 border-t border-gray-100 animate-in fade-in slide-in-from-top-1 duration-200">
                    {expandedContent}
                </div>
            )}
        </div>
    );
}

export default function VocabularyPage() {
    return (
        <div className="p-8 max-w-4xl mx-auto">
            <Link
                href="/admin/documentation"
                className="inline-flex items-center text-sm font-bold text-gray-500 hover:text-black mb-6 transition-colors"
            >
                <ArrowLeft size={16} className="mr-1" />
                Back to Docs
            </Link>

            <h1 className="text-3xl font-black mb-8 flex items-center gap-3">
                <BookOpen className="w-8 h-8" />
                Vocabulary
            </h1>

            <div className="space-y-6">

                {/* Core Concepts */}
                <h2 className="text-2xl font-black mt-8 mb-4">Core Concepts</h2>

                {/* ISIT Construct */}
                <VocabularyCard
                    title="ISIT Construct"
                    badgeText="Framework"
                    badgeColor="bg-blue-100 text-blue-800"
                    summary="The binary model of reality that categorizes the inseparable combination of the two primary aspects of existence—IS and IT—as the totality of all that exists. It serves as a neutral framework for collaborative sensemaking."
                />

                {/* IS */}
                <VocabularyCard
                    title="IS"
                    badgeText="Primordial Aspect"
                    badgeColor="bg-yellow-100 text-yellow-800"
                    summary="The active, animating principle of reality that initiates action, awareness, change, and creation."
                    expandedContent={
                        <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                            <p>
                                <strong>IS</strong> is the active, animating, generative principle of reality.
                            </p>
                            <p>
                                It is the <em>that-which-acts</em>, the dynamic force that brings motion, change, intention, awareness, and emergence into existence. IS is not a thing or object in itself; rather, it is the essence of activity, vitality, and becoming that animates all objects and experiences.
                            </p>
                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <p className="font-semibold mb-2 text-yellow-900">Within the ISIT Construct, IS represents:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>The source of action and creation</li>
                                    <li>The animating force behind all form</li>
                                    <li>Awareness, intention, will, and energy</li>
                                    <li>The dynamic aspect of existence</li>
                                    <li>That which initiates, moves, transforms, and expresses</li>
                                </ul>
                            </div>
                            <p>
                                IS never exists in isolation. It always operates through <strong>IT</strong> (the passive, defined, structural aspect of reality). Together, IS and IT form the prime duality from which all objects, phenomena, and experiences arise.
                            </p>
                            <p className="font-bold text-black border-l-4 border-yellow-400 pl-3">
                                In short: IS is what makes things happen.
                            </p>
                        </div>
                    }
                />

                {/* IT */}
                <VocabularyCard
                    title="IT"
                    badgeText="Primordial Aspect"
                    badgeColor="bg-gray-100 text-gray-800"
                    summary="The passive, structural principle of reality that manifests as finite, limited, bounded, and partial form."
                    expandedContent={
                        <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                            <p>
                                <strong>IT</strong> is the passive, defined, structural principle of reality.
                            </p>
                            <p>
                                It is the <em>that-which-is</em>, the stabilizing substrate that gives form, boundaries, persistence, and identity to existence. IT is not an active force; rather, it is the medium, container, or structure through which IS operates and becomes manifest.
                            </p>
                            <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                <p className="font-semibold mb-2 text-gray-900">Within the ISIT Construct, IT represents:</p>
                                <ul className="list-disc list-inside space-y-1">
                                    <li>Form, structure, and definition</li>
                                    <li>Matter, objects, and states</li>
                                    <li>Constraints, rules, and limits</li>
                                    <li>The static or inert aspect of existence</li>
                                    <li>That which receives, contains, records, and preserves</li>
                                </ul>
                            </div>
                            <p>
                                IT does not initiate action. On its own, it is inert and unchanging. Meaning, motion, and relevance arise only when IS acts upon IT. Together, IT and IS form the prime duality at the heart of Objective Reality.
                            </p>
                            <p className="font-bold text-black border-l-4 border-gray-400 pl-3">
                                In short: IT is what things are.
                            </p>
                        </div>
                    }
                />

                {/* ISITism */}
                <VocabularyCard
                    title="ISITism"
                    badgeText="Philosophy"
                    badgeColor="bg-purple-100 text-purple-800"
                    summary="The philosophy and cultural movement built around the understanding and application of the ISIT Construct to solve the global meta-crisis through raised collective awareness and alignment."
                />

                {/* ISish */}
                <VocabularyCard
                    title="ISish"
                    badgeText="Adjective"
                    badgeColor="bg-yellow-50 text-yellow-700"
                    summary="An adjective describing an object, concept, or behavior with characteristics that are predominantly aligned with the nature of IS."
                />

                {/* ITistic */}
                <VocabularyCard
                    title="ITistic"
                    badgeText="Adjective"
                    badgeColor="bg-gray-50 text-gray-700"
                    summary="An adjective describing an object, concept, or behavior with characteristics that are predominantly aligned with the nature of IT."
                />

                <h2 className="text-2xl font-black mt-8 mb-4">Metrics</h2>

                {/* AQ Definition */}
                <VocabularyCard
                    title="Awareness Quotient (AQ)"
                    badgeText="Metric"
                    badgeColor="bg-green-100 text-green-800"
                    summary="A calculated score (0-100) representing the user's alignment with the consensus or 'correct' reality."
                    expandedContent={
                        <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                            <p>
                                It is calculated as the percentage of total possible points earned, penalized by the user's Deviance Quotient (DQ).
                                A higher AQ indicates strong alignment and high accuracy.
                            </p>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <code className="text-sm font-mono text-gray-600">
                                    AQ = (Total Earned Points / Total Possible Points) * 100 / (1 + DQ)
                                </code>
                            </div>
                        </div>
                    }
                />

                {/* DQ Definition */}
                <VocabularyCard
                    title="Deviance Quotient (DQ)"
                    badgeText="Metric"
                    badgeColor="bg-red-100 text-red-800"
                    summary="A ratio (0.00 - 1.00) representing how often the user deviates from the established consensus (i.e., votes incorrectly)."
                    expandedContent={
                        <div className="space-y-4 text-gray-600 leading-relaxed text-sm">
                            <p>
                                It is calculated as the number of incorrect polls divided by the total number of polls taken.
                                A lower DQ is better; a high DQ negatively impacts the user's AQ score.
                            </p>
                            <div className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                                <code className="text-sm font-mono text-gray-600">
                                    DQ = Incorrect Polls / Total Polls Taken
                                </code>
                            </div>
                        </div>
                    }
                />

            </div>
        </div>
    );
}
