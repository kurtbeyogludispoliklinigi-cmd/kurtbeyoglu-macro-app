import React, { useMemo } from 'react';
import { Treatment } from '@/lib/types'; // Assuming Payment type exists or we'll infer
import { CheckCircle2, Calendar, Clock, Banknote, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';

interface TimelineItem {
    id: string;
    type: 'treatment' | 'payment' | 'appointment' | 'note';
    date: Date;
    title: string;
    subtitle?: string; // e.g. Tooth No
    description?: string; // Notes
    amount?: number;
    status?: 'planned' | 'completed' | 'cancelled';
    performer?: string; // Doctor name or user who added it
}

interface PatientTimelineProps {
    treatments: Treatment[];
    // Future: payments: Payment[];
    className?: string;
}

export function PatientTimeline({ treatments, className }: PatientTimelineProps) {

    // Transform data into timeline items
    const timelineItems: TimelineItem[] = useMemo(() => {
        const items: TimelineItem[] = [];

        // Process Treatments
        treatments.forEach(t => {
            items.push({
                id: t.id,
                type: 'treatment',
                date: new Date(t.created_at), // Or completed_date if available
                title: t.procedure,
                subtitle: t.tooth_no ? `Diş No: ${t.tooth_no}` : undefined,
                description: t.notes,
                amount: t.cost,
                status: t.status,
                performer: t.added_by
            });
        });

        // Sort by date descending
        return items.sort((a, b) => b.date.getTime() - a.date.getTime());
    }, [treatments]);

    if (timelineItems.length === 0) {
        return (
            <div className="text-center py-10">
                <p className="text-slate-400">Henüz bir zaman çizelgesi verisi yok.</p>
            </div>
        );
    }

    return (
        <div className={cn("relative pl-4 space-y-8", className)}>
            {/* Vertical Line */}
            <div className="absolute top-0 left-[19px] h-full w-0.5 bg-slate-200" />

            {timelineItems.map((item) => (
                <div key={item.id} className="relative group">
                    {/* Dot / Icon */}
                    <div className={cn(
                        "absolute left-0 w-10 h-10 rounded-full border-4 border-white flex items-center justify-center z-10 shadow-sm transition-transform group-hover:scale-110",
                        item.type === 'treatment' && item.status === 'completed' ? "bg-teal-500 text-white" :
                            item.type === 'treatment' && item.status === 'planned' ? "bg-blue-500 text-white" :
                                item.type === 'payment' ? "bg-amber-500 text-white" :
                                    "bg-slate-400 text-white"
                    )}>
                        {item.type === 'treatment' && item.status === 'completed' && <CheckCircle2 size={18} />}
                        {item.type === 'treatment' && item.status === 'planned' && <Calendar size={18} />}
                        {item.type === 'payment' && <Banknote size={18} />}
                        {item.type === 'note' && <FileText size={18} />}
                    </div>

                    {/* Content Card */}
                    <div className="ml-14 bg-white p-4 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow relative">
                        {/* Triangle arrow */}
                        <div className="absolute top-5 -left-2 w-4 h-4 bg-white border-l border-b border-slate-100 transform rotate-45" />

                        <div className="flex justify-between items-start mb-1">
                            <div>
                                <h4 className={cn("font-bold text-lg",
                                    item.status === 'planned' ? "text-blue-700" : "text-slate-800"
                                )}>
                                    {item.title}
                                </h4>
                                {item.subtitle && (
                                    <span className="inline-block bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-md font-medium mt-1">
                                        {item.subtitle}
                                    </span>
                                )}
                            </div>
                            <div className="text-right">
                                <div className="text-xs text-slate-400 font-medium flex items-center gap-1 justify-end">
                                    <Clock size={12} />
                                    {format(item.date, "d MMMM yyyy, HH:mm", { locale: tr })}
                                </div>
                                {item.amount && (
                                    <div className="font-bold text-teal-600 mt-1">
                                        {item.amount.toLocaleString('tr-TR')} ₺
                                    </div>
                                )}
                            </div>
                        </div>

                        {item.description && (
                            <p className="text-sm text-slate-600 mt-2 bg-slate-50 p-2 rounded-lg italic border border-slate-100/50">
                                {item.description}
                            </p>
                        )}

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-50">
                            <div className="text-xs text-slate-400">
                                {item.performer && (
                                    <span>İşlemi Yapan: <strong className="text-slate-600">{item.performer}</strong></span>
                                )}
                            </div>

                            {/* Status Badge */}
                            <div>
                                {item.status === 'planned' && (
                                    <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full font-medium">Planlanan</span>
                                )}
                                {item.status === 'completed' && (
                                    <span className="px-2 py-1 bg-teal-100 text-teal-700 text-xs rounded-full font-medium">Tamamlandı</span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
