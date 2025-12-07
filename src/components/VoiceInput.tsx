'use client';

import { Mic, MicOff, X, Check } from 'lucide-react';
import { useSpeechToText } from '@/hooks/useSpeechToText';
import { motion, AnimatePresence } from 'framer-motion';

interface VoiceInputProps {
    onTranscript: (text: string) => void;
    placeholder?: string;
}

export function VoiceInput({ onTranscript, placeholder = 'Konuşmaya başlayın...' }: VoiceInputProps) {
    const { transcript, isListening, isSupported, error, start, stop, reset } = useSpeechToText();

    if (!isSupported) {
        return null; // Don't show if not supported
    }

    const handleAccept = () => {
        if (transcript.trim()) {
            onTranscript(transcript.trim());
            reset();
            stop();
        }
    };

    const handleCancel = () => {
        reset();
        stop();
    };

    return (
        <div className="relative inline-flex items-center">
            {/* Mic Button */}
            <motion.button
                type="button"
                onClick={isListening ? stop : start}
                className={`p-2 rounded-full transition ${isListening
                        ? 'bg-red-500 text-white animate-pulse'
                        : 'bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-slate-600'
                    }`}
                whileTap={{ scale: 0.9 }}
                title={isListening ? 'Kaydı Durdur' : 'Sesli Giriş'}
            >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </motion.button>

            {/* Transcript Popup */}
            <AnimatePresence>
                {isListening && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute bottom-full left-0 mb-2 w-64 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-gray-200 dark:border-slate-600 p-3 z-50"
                    >
                        {/* Recording indicator */}
                        <div className="flex items-center gap-2 mb-2">
                            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                            <span className="text-xs text-gray-500 dark:text-gray-400">Dinleniyor...</span>
                        </div>

                        {/* Transcript */}
                        <div className="min-h-[60px] max-h-[120px] overflow-y-auto text-sm text-gray-800 dark:text-gray-100 bg-gray-50 dark:bg-slate-700 rounded-lg p-2 mb-3">
                            {transcript || <span className="text-gray-400">{placeholder}</span>}
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-xs text-red-500 mb-2">Hata: {error}</p>
                        )}

                        {/* Actions */}
                        <div className="flex gap-2">
                            <button
                                type="button"
                                onClick={handleCancel}
                                className="flex-1 py-1.5 px-3 text-xs bg-gray-100 dark:bg-slate-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-200 dark:hover:bg-slate-500 transition flex items-center justify-center gap-1"
                            >
                                <X size={12} /> İptal
                            </button>
                            <button
                                type="button"
                                onClick={handleAccept}
                                disabled={!transcript.trim()}
                                className="flex-1 py-1.5 px-3 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition disabled:opacity-50 flex items-center justify-center gap-1"
                            >
                                <Check size={12} /> Ekle
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
