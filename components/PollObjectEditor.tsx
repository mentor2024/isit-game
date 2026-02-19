"use client";

import { useState } from "react";

export default function PollObjectEditor({
    pollType,
    objects
}: {
    pollType: string;
    objects: any[];
}) {
    // Initialize state from existing objects
    const [obj1Side, setObj1Side] = useState<"IS" | "IT">(objects[0]?.correct_side || "IS");
    const [obj2Side, setObj2Side] = useState<"IS" | "IT">(objects[1]?.correct_side || "IT");

    const handleSideChange = (objNum: 1 | 2, side: "IS" | "IT") => {
        if (objNum === 1) {
            setObj1Side(side);
            setObj2Side(side === "IS" ? "IT" : "IS");
        } else {
            setObj2Side(side);
            setObj1Side(side === "IS" ? "IT" : "IS");
        }
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {[1, 2].map((num, i) => {
                const obj = objects[i];
                const currentSide = num === 1 ? obj1Side : obj2Side;

                return (
                    <div key={num} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                        <h3 className="font-bold mb-3">Object {num}</h3>
                        <div className="flex flex-col gap-3">
                            {pollType === "isit_image" && (
                                <>
                                    {obj?.image_url && (
                                        <div className="w-20 h-20 rounded-md overflow-hidden bg-gray-200 border border-gray-300">
                                            <img src={obj.image_url} className="w-full h-full object-cover" />
                                        </div>
                                    )}
                                    <input type="file" name={`obj${num}_image`} accept="image/*" className="border-2 border-dashed border-gray-300 p-4 rounded-lg bg-white" />
                                </>
                            )}

                            <input
                                name={`obj${num}_text`}
                                defaultValue={obj?.text}
                                placeholder={pollType === "isit_image" ? "Label / Alt Text" : "Word"}
                                required
                                className="border-2 border-black p-2 rounded-lg"
                            />

                            <div className="flex gap-4 mt-2">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`obj${num}_side`}
                                        value="IS"
                                        checked={currentSide === 'IS'}
                                        onChange={() => handleSideChange(num as 1 | 2, 'IS')}
                                        className="accent-black w-5 h-5"
                                    />
                                    <span className="font-bold">IS</span>
                                </label>
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="radio"
                                        name={`obj${num}_side`}
                                        value="IT"
                                        checked={currentSide === 'IT'}
                                        onChange={() => handleSideChange(num as 1 | 2, 'IT')}
                                        className="accent-black w-5 h-5"
                                    />
                                    <span className="font-bold">IT</span>
                                </label>
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}
