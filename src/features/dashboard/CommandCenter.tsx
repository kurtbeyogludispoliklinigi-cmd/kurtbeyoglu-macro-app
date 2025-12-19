import React, { useState, useEffect, useRef } from 'react';
import { Search, User, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Patient } from '@/lib/types';

interface CommandCenterProps {
    isOpen: boolean;
    onClose: () => void;
    onSelectPatient: (patient: Patient) => void;
    currentUserRole: string;
    patients: Patient[];
}

type CommandItem =
    | { type: 'command'; id: string; label: string; icon: React.ReactNode; action: string; subLabel?: string; data?: undefined }
    | { type: 'patient'; id: string; label: string; subLabel: string; icon: React.ReactNode; data: Patient; action?: undefined };

export function CommandCenter({ isOpen, onClose, onSelectPatient, currentUserRole, patients }: CommandCenterProps) {
    const [query, setQuery] = useState('');
    const [selectedIndex, setSelectedIndex] = useState(0);
    const inputRef = useRef<HTMLInputElement>(null);

    // Filter items based on query
    const filteredItems = React.useMemo(() => {
        if (!query) return [];

        const lowerQuery = query.toLowerCase();

        // Commands
        const commands: CommandItem[] = [
            { type: 'command' as const, id: 'new-patient', label: 'Yeni Hasta Ekle', icon: <User className="w-4 h-4" />, action: 'new-patient' },
            // Add more commands here later like "New Appointment"
        ].filter(cmd => cmd.label.toLowerCase().includes(lowerQuery));

        // Patients
        const matchedPatients: CommandItem[] = (patients || [])
            .filter(p => p.name.toLowerCase().includes(lowerQuery) || p.phone?.includes(lowerQuery))
            .slice(0, 5)
            .map(p => ({
                type: 'patient' as const,
                id: p.id,
                label: p.name,
                subLabel: p.phone,
                icon: <User className="w-4 h-4" />,
                data: p
            }));

        return [...commands, ...matchedPatients];
    }, [query, patients]);

    // Reset selection when query changes
    useEffect(() => {
        setSelectedIndex(0);
    }, [query]);

    // Focus input when opened
    useEffect(() => {
        if (isOpen) {
            setTimeout(() => inputRef.current?.focus(), 50);
        } else {
            setQuery('');
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!isOpen) return;

            switch (e.key) {
                case 'ArrowDown':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev + 1) % filteredItems.length);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    setSelectedIndex(prev => (prev - 1 + filteredItems.length) % filteredItems.length);
                    break;
                case 'Enter':
                    e.preventDefault();
                    const selected = filteredItems[selectedIndex];
                    if (selected) handleSelect(selected);
                    break;
                case 'Escape':
                    onClose();
                    break;
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, filteredItems, selectedIndex]);

    const handleSelect = (item: CommandItem) => {
        if (item.type === 'patient') {
            onSelectPatient(item.data);
            onClose();
        } else if (item.type === 'command') {
            if (item.action === 'new-patient') {
                // Trigger new patient flow (might need a prop for this)
                // For now just close, user has to click valid button
                // TODO: Implement direct command actions
                onClose();
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-start justify-center pt-[15vh] p-4 animate-in fade-in duration-200">
            <div className="bg-white w-full max-w-xl rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">

                {/* Search Header */}
                <div className="flex items-center border-b px-4 py-3 gap-3">
                    <Search className="w-5 h-5 text-slate-400" />
                    <input
                        ref={inputRef}
                        type="text"
                        placeholder="Hasta ara veya komut yaz..."
                        className="flex-1 outline-none text-lg text-slate-700 placeholder:text-slate-400"
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                    />
                    <kbd className="hidden md:inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium text-slate-500 bg-slate-100 rounded border border-slate-200">
                        ESC
                    </kbd>
                </div>

                {/* Results List */}
                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {filteredItems.length === 0 && query && (
                        <div className="text-center py-8 text-slate-500">
                            Sonuç bulunamadı for "{query}"
                        </div>
                    )}

                    {filteredItems.length === 0 && !query && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            Aramaya başlamak için yazın...
                        </div>
                    )}

                    {filteredItems.map((item, index) => (
                        <div
                            key={`${item.type} -${item.id} `}
                            onClick={() => handleSelect(item)}
                            className={cn(
                                "flex items-center gap-3 px-3 py-3 rounded-lg cursor-pointer transition-colors",
                                index === selectedIndex ? "bg-slate-100" : "hover:bg-slate-50"
                            )}
                        >
                            <div className={cn(
                                "w-8 h-8 rounded-full flex items-center justify-center",
                                item.type === 'command' ? "bg-slate-200 text-slate-600" : "bg-teal-100 text-teal-600"
                            )}>
                                {item.icon}
                            </div>
                            <div className="flex-1">
                                <div className="font-medium text-slate-800 flex items-center gap-2">
                                    {item.label}
                                    {index === selectedIndex && (
                                        <ArrowRight className="w-3 h-3 text-slate-400 animate-pulse ml-auto" />
                                    )}
                                </div>
                                {item.subLabel && (
                                    <div className="text-xs text-slate-500">{item.subLabel}</div>
                                )}
                            </div>
                            {item.type === 'command' && (
                                <span className="text-xs text-slate-400 border px-1.5 py-0.5 rounded">Komut</span>
                            )}
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-4 py-2 border-t flex items-center justify-between text-xs text-slate-400">
                    <div className="flex items-center gap-4">
                        <span>Navigate <kbd>↓</kbd> <kbd>↑</kbd></span>
                        <span>Select <kbd>↵</kbd></span>
                    </div>
                    <span>Kurtbeyoğlu Diş</span>
                </div>
            </div>
        </div>
    );
}
