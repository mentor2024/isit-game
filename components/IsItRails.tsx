"use client";

import { useState } from "react";
import { X } from "lucide-react";

type RailItem = {
    id?: string;
    text: string;
    side: "IS" | "IT";
};

const RailColumn = ({
    title,
    items,
    side,
    onOpenModal
}: {
    title: string,
    items: RailItem[],
    side: "IS" | "IT",
    onOpenModal: () => void
}) => (
    <div className={`flex-1 rounded-[2rem] overflow-hidden border-4 border-white shadow-[0_0_30px_rgba(255,255,255,0.1)] ${side === "IS" ? "bg-white text-black" : "bg-black text-white"}`}>
        <div className={`${side === "IS" ? "bg-black text-white border-black" : "bg-white text-black border-white"} p-3 text-center border-b-4`}>
            <h3 className="text-3xl font-black leading-none tracking-tighter">{title}</h3>
        </div>
        <div className="p-4 overflow-y-auto max-h-[80vh] custom-scrollbar">
            <div className={`flex justify-between text-xs font-bold mb-4 px-2 border-b pb-2 ${side === "IS" ? "text-gray-400 border-gray-200" : "text-gray-500 border-gray-800"}`}>
                <span>WORD</span>
                <span>%</span>
            </div>
            <ul className="space-y-2">
                {items.map((item, idx) => (
                    <li key={item.id || `${side}-${idx}`} className="flex justify-between items-center font-bold text-sm">
                        <span className="truncate mr-2 max-w-[12ch]">{item.text}</span>
                        <button
                            onClick={onOpenModal}
                            className={`text-[10px] px-2 py-0.5 rounded-full transition-colors flex-shrink-0 ${side === "IS" ? "bg-black text-white hover:bg-gray-800" : "bg-white text-black hover:bg-gray-200"}`}
                        >
                            100%
                        </button>
                    </li>
                ))}
                {items.length === 0 && (
                    <li className={`italic text-center py-10 text-xs ${side === "IS" ? "text-gray-400" : "text-gray-600"}`}>
                        No items yet.
                    </li>
                )}
            </ul>
        </div>
    </div>
);

export default function IsItRails({
    items,
    children,
    topLeftContent,
    topRightContent,
    hideRails = false
}: {
    items: RailItem[],
    children?: React.ReactNode,
    topLeftContent?: React.ReactNode,
    topRightContent?: React.ReactNode,
    hideRails?: boolean
}) {
    const [modalOpen, setModalOpen] = useState(false);
    const handleOpenModal = () => setModalOpen(true);

    // Filter items
    const isItems = items.filter(i => i.side === "IS");
    const itItems = items.filter(i => i.side === "IT");

    return (
        <div className="w-full h-full flex flex-col md:flex-row justify-center items-start gap-4 relative z-10 animate-in fade-in duration-700">
            {/* IS Column (Left) */}
            <div className="w-52 md:w-60 flex-shrink-0 flex flex-col gap-4 order-1">
                {topLeftContent || <div className="h-0" />}
                {!hideRails && <RailColumn title='IS' items={isItems} side="IS" onOpenModal={handleOpenModal} />}
            </div>

            {/* Main Content (Center) */}
            <div className="flex-1 max-w-3xl w-full order-2 flex flex-col items-center">
                {children}
            </div>

            {/* IT Column (Right) */}
            <div className="w-52 md:w-60 flex-shrink-0 flex flex-col gap-4 order-3">
                {topRightContent || <div className="h-0" />}
                {!hideRails && <RailColumn title='IT' items={itItems} side="IT" onOpenModal={handleOpenModal} />}
            </div>

            {/* Modal */}
            {modalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
                        onClick={() => setModalOpen(false)}
                    ></div>

                    {/* Dialog */}
                    <div className="relative bg-white text-black p-8 rounded-3xl max-w-sm w-full text-center shadow-2xl animate-in zoom-in-95 duration-200">
                        <button
                            onClick={() => setModalOpen(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
                        >
                            <X size={24} />
                        </button>

                        <div className="mb-4 text-4xl">📊</div>
                        <h4 className="text-xl font-bold mb-2">Community Consensus</h4>
                        <p className="text-gray-600 font-medium">
                            This is the percentage agreement on this mapping among full ISITAS members.
                        </p>

                        <button
                            onClick={() => setModalOpen(false)}
                            className="mt-6 bg-black text-white px-6 py-2 rounded-full font-bold hover:bg-gray-800 transition-colors"
                        >
                            Got it
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
