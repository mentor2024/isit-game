'use client';

import { useMemo, useState, ReactNode } from 'react';
import Image from 'next/image';

type Target = 'IS' | 'IT';
type WordKey = 'left' | 'right';

export default function BinaryAssign({
  leftWord,
  rightWord,
  isIconSrc = '/images/icon_is_100x100.png',
  itIconSrc = '/images/icon_it_100x100.png',
  onAssigned,
  wordFlip = false,
  symbolFlip = false,
  footer = null, // row 4 content
}: {
  leftWord: string;
  rightWord: string;
  isIconSrc?: string;
  itIconSrc?: string;
  onAssigned?: (assignment: { IS: string; IT: string }, chosen: Target) => void;
  wordFlip?: boolean;
  symbolFlip?: boolean;
  footer?: ReactNode;
}) {
  const words = useMemo(() => ({ left: leftWord, right: rightWord }), [leftWord, rightWord]);
  const wordSlots: WordKey[] = wordFlip ? ['right', 'left'] : ['left', 'right'];
  const symbolSlots: Target[] = symbolFlip ? ['IT', 'IS'] : ['IS', 'IT'];

  const [selectedWord, setSelectedWord] = useState<WordKey | null>(null);
  const [finalIdxForWord, setFinalIdxForWord] = useState<{ left?: 0 | 1; right?: 0 | 1 } | null>(null);
  const hasAssignment = !!finalIdxForWord;

  const assign = (target: Target, which: WordKey, slotIndex: 0 | 1) => {
    const chosen = words[which];
    const other = which === 'left' ? words.right : words.left;
    const next = target === 'IS' ? { IS: chosen, IT: other } : { IS: other, IT: chosen };
    const forChosen = slotIndex;
    const forOther = (slotIndex ^ 1) as 0 | 1;
    setFinalIdxForWord(which === 'left' ? { left: forChosen, right: forOther } : { left: forOther, right: forChosen });
    setSelectedWord(null);
    onAssigned?.(next, target);
  };

  // DnD + click
  const onDragStart = (e: React.DragEvent<HTMLSpanElement>, which: WordKey) => {
    e.dataTransfer.setData('text/plain', which);
    e.dataTransfer.effectAllowed = 'move';
  };
  const onDragOver = (e: React.DragEvent<HTMLDivElement>) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; };
  const onDrop = (e: React.DragEvent<HTMLDivElement>, target: Target, slotIndex: 0 | 1) => {
    e.preventDefault();
    const which = e.dataTransfer.getData('text/plain') as WordKey;
    if (which === 'left' || which === 'right') assign(target, which, slotIndex);
  };
  const onWordClick = (which: WordKey) => setSelectedWord(prev => (prev === which ? null : which));
  const onTargetClick = (target: Target, slotIndex: 0 | 1) => { if (selectedWord) assign(target, selectedWord, slotIndex); };

  const wordClasses = (active: boolean) =>
    ['select-none cursor-grab active:cursor-grabbing transition',
     active ? 'underline decoration-2' : 'hover:opacity-80'].join(' ');
  const wordKeyForCol = (col: 0 | 1): WordKey => (!finalIdxForWord ? wordSlots[col] : (finalIdxForWord.left === col ? 'left' : 'right'));

  return (
    <div className="relative mx-auto w-full">
      {/* Instructions with extra breathing room below */}
      <div className="text-center text-[clamp(0.72rem,1.5vw,0.88rem)] text-black/70 mb-[50px]">
        Drag a word onto a symbol below, or click a word then click IS or IT.
      </div>

      {/* ONE unified grid controls both columns across all rows */}
      <div className="relative mx-auto w-full max-w-[820px] grid grid-cols-2 grid-rows-[auto_50px_auto_auto] gap-y-2 justify-items-center">
        {/* Row 1: aligned words (centered in their columns after assignment) */}
        <div className="row-start-1 col-start-1 w-full flex justify-center">
          <span className={[
            'text-center font-semibold tracking-tight transition-opacity duration-150',
            'text-[clamp(1.1rem,3.2vw,1.8rem)]',
            hasAssignment ? 'opacity-100' : 'opacity-0 pointer-events-none'
          ].join(' ')}>
            {words[wordKeyForCol(0)]}
          </span>
        </div>
        <div className="row-start-1 col-start-2 w-full flex justify-center">
          <span className={[
            'text-center font-semibold tracking-tight transition-opacity duration-150 delay-75',
            'text-[clamp(1.1rem,3.2vw,1.8rem)]',
            hasAssignment ? 'opacity-100' : 'opacity-0 pointer-events-none'
          ].join(' ')}>
            {words[wordKeyForCol(1)]}
          </span>
        </div>

        {/* Pre-assign pair sits OVER row 1 (centered across both columns) */}
        <div className={[
          'absolute inset-x-0 -top-1 flex items-center justify-center gap-3',
          'transition-opacity duration-150',
          hasAssignment ? 'opacity-0 pointer-events-none' : 'opacity-100'
        ].join(' ')}>
          <span
            role="button" tabIndex={0} draggable
            onDragStart={(e)=>onDragStart(e, wordSlots[0])}
            onClick={()=>onWordClick(wordSlots[0])}
            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();onWordClick(wordSlots[0]);}}}
            className={['font-semibold text-[clamp(1.1rem,3.2vw,1.8rem)]', wordClasses(selectedWord===wordSlots[0])].join(' ')}
          >
            {words[wordSlots[0]]}
          </span>
          <span className="text-black/40 select-none text-[clamp(1rem,2.8vw,1.4rem)]">|</span>
          <span
            role="button" tabIndex={0} draggable
            onDragStart={(e)=>onDragStart(e, wordSlots[1])}
            onClick={()=>onWordClick(wordSlots[1])}
            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();onWordClick(wordSlots[1]);}}}
            className={['font-semibold text-[clamp(1.1rem,3.2vw,1.8rem)]', wordClasses(selectedWord===wordSlots[1])].join(' ')}
          >
            {words[wordSlots[1]]}
          </span>
        </div>

        {/* Row 2: 50px divider — lines are centered in the SAME columns as words/icons */}
        <div className="row-start-2 col-start-1 grid place-items-center h-[50px]">
          <div className={['w-px h-full bg-black/60 transition-opacity duration-150', hasAssignment ? 'opacity-100' : 'opacity-0'].join(' ')} />
        </div>
        <div className="row-start-2 col-start-2 grid place-items-center h-[50px]">
          <div className={['w-px h-full bg-black/60 transition-opacity duration-150 delay-75', hasAssignment ? 'opacity-100' : 'opacity-0'].join(' ')} />
        </div>

        {/* Row 3: symbols (centered in columns) */}
        <div className="row-start-3 col-start-1 w-full flex justify-center">
          <div
            onDragOver={(e)=>{e.preventDefault();}}
            onDrop={(e)=>onDrop(e, symbolSlots[0], 0)}
            onClick={()=>onTargetClick(symbolSlots[0], 0)}
            role="button" tabIndex={0} aria-label={symbolSlots[0]}
            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();onTargetClick(symbolSlots[0],0);} }}
            className="select-none"
          >
            <Image
              src={symbolSlots[0]==='IS'?isIconSrc:itIconSrc}
              alt={symbolSlots[0]}
              width={168} height={168}
              sizes="(max-width: 640px) 4.25rem, (max-width: 768px) 5rem, (max-width: 1024px) 5.5rem, 6rem"
              className="h-auto w-16 sm:w-20 md:w-22 lg:w-24"
              priority
            />
          </div>
        </div>
        <div className="row-start-3 col-start-2 w-full flex justify-center">
          <div
            onDragOver={(e)=>{e.preventDefault();}}
            onDrop={(e)=>onDrop(e, symbolSlots[1], 1)}
            onClick={()=>onTargetClick(symbolSlots[1], 1)}
            role="button" tabIndex={0} aria-label={symbolSlots[1]}
            onKeyDown={(e)=>{ if(e.key==='Enter'||e.key===' '){e.preventDefault();onTargetClick(symbolSlots[1],1);} }}
            className="select-none"
          >
            <Image
              src={symbolSlots[1]==='IS'?isIconSrc:itIconSrc}
              alt={symbolSlots[1]}
              width={168} height={168}
              sizes="(max-width: 640px) 4.25rem, (max-width: 768px) 5rem, (max-width: 1024px) 5.5rem, 6rem"
              className="h-auto w-16 sm:w-20 md:w-22 lg:w-24"
              priority
            />
          </div>
        </div>

        {/* Row 4: footer (Confirm), centered under both columns, with extra top margin */}
        <div className="row-start-4 col-span-2 w-full flex justify-center mt-[50px]">
          {footer}
        </div>
      </div>
    </div>
  );
}
