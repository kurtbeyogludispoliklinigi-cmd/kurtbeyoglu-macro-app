import React from 'react';
import { cn } from '@/lib/utils';

interface OdontogramProps {
    selectedTeeth: string[];
    onToggleTooth: (toothId: string) => void;
    className?: string;
}

// ISO 3950 notation
// Top Right (18-11), Top Left (21-28)
// Bottom Right (48-41), Bottom Left (31-38)

const TEETH = {
    topRight: [18, 17, 16, 15, 14, 13, 12, 11],
    topLeft: [21, 22, 23, 24, 25, 26, 27, 28],
    bottomRight: [48, 47, 46, 45, 44, 43, 42, 41],
    bottomLeft: [31, 32, 33, 34, 35, 36, 37, 38]
};

export function Odontogram({ selectedTeeth, onToggleTooth, className }: OdontogramProps) {

    const renderTooth = (id: number) => {
        const isSelected = selectedTeeth.includes(id.toString());

        return (
            <button
                key={id}
                type="button"
                onClick={() => onToggleTooth(id.toString())}
                className={cn(
                    "flex flex-col items-center justify-center p-1 md:p-2 transition-all duration-200 group relative",
                    "hover:scale-110 focus:outline-none"
                )}
            >
                {/* Visual representation of a tooth - Simple generic shape for now */}
                <div className={cn(
                    "w-8 h-8 md:w-10 md:h-10 rounded-lg border-2 flex items-center justify-center text-xs md:text-sm font-bold shadow-sm transition-colors",
                    isSelected
                        ? "bg-[#0e7490] border-[#0e7490] text-white shadow-md shadow-cyan-900/20"
                        : "bg-white border-slate-200 text-slate-400 group-hover:border-[#0e7490] group-hover:text-[#0e7490]"
                )}>
                    {id}
                </div>

                {/* Root/Gum hint */}
                <div className={cn(
                    "w-1 h-3 mt-1 rounded-full transition-colors",
                    isSelected ? "bg-[#0e7490]/50" : "bg-slate-100 group-hover:bg-[#0e7490]/20"
                )} />
            </button>
        );
    };

    return (
        <div className={cn("p-4 bg-slate-50 rounded-xl border border-slate-200", className)}>
            <div className="overflow-x-auto pb-4">
                <div className="flex flex-col gap-8 min-w-[600px] md:min-w-0 max-w-3xl mx-auto">

                    {/* Upper Jaw (Maxilla) */}
                    <div className="flex justify-center gap-8 md:gap-12 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-slate-200" />

                        {/* Top Right (18-11) */}
                        <div className="flex gap-1 md:gap-2">
                            {TEETH.topRight.map(renderTooth)}
                        </div>

                        {/* Top Left (21-28) */}
                        <div className="flex gap-1 md:gap-2">
                            {TEETH.topLeft.map(renderTooth)}
                        </div>
                    </div>

                    {/* Lower Jaw (Mandible) */}
                    <div className="flex justify-center gap-8 md:gap-12 relative">
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-px h-full bg-slate-200" />

                        {/* Bottom Right (48-41) */}
                        <div className="flex gap-1 md:gap-2">
                            {TEETH.bottomRight.map(renderTooth)}
                        </div>

                        {/* Bottom Left (31-38) */}
                        <div className="flex gap-1 md:gap-2">
                            {TEETH.bottomLeft.map(renderTooth)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="text-center mt-0 text-xs text-slate-400 font-medium">
                Görsel Diş Şeması (Yetişkin) • <span className="md:hidden">Sığmayan dişler için kaydırın ↔️</span>
            </div>
        </div>
    );
}
